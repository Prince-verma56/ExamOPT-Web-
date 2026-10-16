"""
ExamOpt — FastAPI Backend Server
Problem Statement C10: Intelligent Examination Timetable Optimization System
GLA University Context: CSED Block AB-XI, BCA / BCA-DS / MCA Programs
"""

import os
import csv
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, Response, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from validator import (
    DataQualityValidator,
    validate_sqlite_database,
    validate_repository,
    validate_csv_file
)
from app.services.optimizer import TimetableOptimizerService
from app.services.exporter import ExporterService
from app.database import (
    DatabaseBackend,
    DatabaseConfig,
    DatabaseRepository,
    get_repository,
    ConfigurationError,
    DatabaseConnectionError,
    DatabaseAuthenticationError,
    EntityNotFoundError,
    DatabaseIntegrityError
)
from app.auth import (
    AuthUser,
    UserRole,
    create_access_token,
    get_current_user,
    get_optional_user,
    require_admin,
    require_authenticated_user,
    resolve_student_authorization,
    resolve_faculty_authorization,
    revoke_token,
    security_scheme
)
from fastapi.security import HTTPAuthorizationCredentials

# Paths
BASE_DIR = Path(__file__).resolve().parent
SQLITE_DB_PATH = BASE_DIR / "examopt.db"
DATASETS_DIR = BASE_DIR / "sample_datasets"
NORMAL_DIR = DATASETS_DIR / "normal_gla_dataset"

# Active state configuration
ACTIVE_STATE = {
    "preset": "normal",
    "last_validated": None,
    "last_run_id": None
}

app = FastAPI(
    title="ExamOpt API",
    description="Intelligent Examination Timetable Optimization System — GLA University",
    version="1.0.0"
)

# -------------------------------------------------------------
# CORS Configuration: Restricted to explicitly configured trusted origins
# -------------------------------------------------------------
cors_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_env:
    trusted_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
    trusted_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5175",
        "http://127.0.0.1:5175"
    ]

env_mode = os.getenv("ENVIRONMENT", "development").lower()
if "*" in trusted_origins and env_mode == "production":
    trusted_origins = ["https://examopt.vercel.app", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=trusted_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def get_db_connection() -> sqlite3.Connection:
    """Backward-compatible direct SQLite connection helper for local scripts."""
    if not SQLITE_DB_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="Database file 'examopt.db' not found. Please run 'python seed_generator.py' first."
        )
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def get_active_dataset_records():
    """Fetches foundation records using the configured repository (SQLite or Supabase)."""
    repo = get_repository()
    return repo.get_active_dataset_records()


# -------------------------------------------------------------
# Pydantic Request Models
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    role: str = Field(..., description="ADMIN, STUDENT, or FACULTY")
    identifier: str = Field(..., description="roll_no, faculty_id, or admin email/username")
    password: Optional[str] = Field(default=None, description="password or institutional PIN")


class GenerateScheduleRequest(BaseModel):
    algorithm: str = Field(default="BACKTRACKING", description="FIRST_FIT, WELSH_POWELL, or BACKTRACKING")


class ValidateRequest(BaseModel):
    preset_name: Optional[str] = Field(default=None, description="normal, lab_bottleneck, capacity_overflow, invalid_corrupted")


# -------------------------------------------------------------
# Authentication Endpoints (Phase C: User Lifecycle & RBAC)
# -------------------------------------------------------------
@app.post("/api/v1/auth/login", tags=["Authentication"])
def login(req: LoginRequest):
    """
    Authenticates a user (Administrator, Student, or Faculty) and issues an access token.
    Resolves genuine database records for students and faculty.
    """
    role_str = req.role.strip().upper()
    identifier = req.identifier.strip()
    password = (req.password or "").strip()

    repo = get_repository()

    if role_str == "ADMIN":
        valid_identifiers = ("admin", "admin@examopt.internal", "admin@gla.ac.in", "administrator")
        if identifier.lower() not in valid_identifiers and not identifier.lower().startswith("admin"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid administrator identifier '{identifier}'."
            )
        admin_pass = os.getenv("EXAMOPT_ADMIN_PASSWORD", "examopt-admin-2026")
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            if password != admin_pass:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid administrator password.")

        token = create_access_token(
            user_id="admin-1",
            role=UserRole.ADMIN,
            email="admin@examopt.internal",
            name="System Administrator"
        )
        return {
            "token": token,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": "admin-1",
                "role": "ADMIN",
                "name": "System Administrator",
                "email": "admin@examopt.internal"
            }
        }

    elif role_str == "STUDENT":
        st_data = repo.get_student_timetable(identifier)
        if not st_data or not st_data.get("student"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Student with Roll Number '{identifier}' not found in university records."
            )
        student = st_data["student"]
        roll_no = student["roll_no"]
        name = student["student_name"]
        email = f"{roll_no.lower()}@glau.ac.in"
        group_id = student["group_id"]

        token = create_access_token(
            user_id=f"stu-{roll_no}",
            role=UserRole.STUDENT,
            student_roll_no=roll_no,
            email=email,
            name=name
        )
        return {
            "token": token,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": f"stu-{roll_no}",
                "role": "STUDENT",
                "name": name,
                "email": email,
                "student_roll_no": roll_no,
                "group_id": group_id,
                "has_backlog": bool(student.get("has_backlog", 0)),
                "enrolled_subjects": student.get("enrolled_subject_ids", "")
            }
        }

    elif role_str == "FACULTY":
        fac_data = repo.get_faculty_timetable(identifier)
        if not fac_data or not fac_data.get("faculty"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Faculty with ID '{identifier}' not found in university records."
            )
        fac = fac_data["faculty"]
        faculty_id = fac["faculty_id"]
        name = fac["name"]
        email = f"{faculty_id.lower()}@glau.ac.in"
        dept = fac["department"]

        token = create_access_token(
            user_id=f"fac-{faculty_id}",
            role=UserRole.FACULTY,
            faculty_id=faculty_id,
            email=email,
            name=name
        )
        return {
            "token": token,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": f"fac-{faculty_id}",
                "role": "FACULTY",
                "name": name,
                "email": email,
                "faculty_id": faculty_id,
                "department": dept,
                "max_duties": fac.get("max_duties", 4),
                "assigned_duties_count": fac_data.get("assigned_duties_count", 0)
            }
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role_str}'. Expected ADMIN, STUDENT, or FACULTY."
        )


@app.get("/api/v1/auth/me", tags=["Authentication"])
def get_auth_me(current_user: AuthUser = Depends(get_current_user)):
    """Returns the current authenticated user's verified identity and profile."""
    repo = get_repository()
    if current_user.is_admin():
        summary = repo.get_summary()
        return {
            "user_id": current_user.user_id,
            "role": "ADMIN",
            "name": "System Administrator",
            "email": current_user.email or "admin@examopt.internal",
            "system_summary": summary
        }
    elif current_user.is_student():
        roll_no = current_user.student_roll_no
        st_data = repo.get_student_timetable(roll_no) if roll_no else None
        if not st_data:
            raise HTTPException(status_code=404, detail="Student profile record not found.")
        student = st_data["student"]
        return {
            "user_id": current_user.user_id,
            "role": "STUDENT",
            "name": student["student_name"],
            "email": current_user.email or f"{roll_no.lower()}@glau.ac.in",
            "student_roll_no": roll_no,
            "group_id": student["group_id"],
            "has_backlog": bool(student.get("has_backlog", 0)),
            "enrolled_subjects": student.get("enrolled_subject_ids", ""),
            "total_enrolled_exams": st_data.get("total_enrolled_exams", 0),
            "scheduled_exams_count": st_data.get("scheduled_exams_count", 0)
        }
    elif current_user.is_faculty():
        faculty_id = current_user.faculty_id
        fac_data = repo.get_faculty_timetable(faculty_id) if faculty_id else None
        if not fac_data:
            raise HTTPException(status_code=404, detail="Faculty profile record not found.")
        fac = fac_data["faculty"]
        return {
            "user_id": current_user.user_id,
            "role": "FACULTY",
            "name": fac["name"],
            "email": current_user.email or f"{faculty_id.lower()}@glau.ac.in",
            "faculty_id": faculty_id,
            "department": fac["department"],
            "max_duties": fac["max_duties"],
            "assigned_duties_count": fac_data.get("assigned_duties_count", 0)
        }
    raise HTTPException(status_code=400, detail="Unknown user profile.")


@app.post("/api/v1/auth/logout", tags=["Authentication"])
async def logout(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
):
    """
    Invalidates the caller session and revokes the access token server-side.
    Future requests presenting this token are rejected with HTTP 401 Unauthorized.
    """
    token_to_revoke = None
    if credentials and credentials.credentials:
        token_to_revoke = credentials.credentials.strip()
    elif request.headers.get("Authorization"):
        auth_header = request.headers.get("Authorization", "").strip()
        if auth_header.lower().startswith("bearer "):
            token_to_revoke = auth_header[7:].strip()

    if not token_to_revoke:
        try:
            body = await request.json()
            if isinstance(body, dict) and body.get("token"):
                token_to_revoke = str(body.get("token")).strip()
        except Exception:
            pass

    if token_to_revoke:
        revoke_token(token_to_revoke)

    return {
        "status": "LOGGED_OUT",
        "message": "Session invalidated successfully."
    }


# -------------------------------------------------------------
# Health & Status Endpoints (Public — Distinguishing App vs DB)
# -------------------------------------------------------------
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    """
    Observable health check that verifies connectivity of the configured database backend
    and distinguishes application process health from database connectivity.
    Never exposes passwords, tokens, connection strings, or private keys.
    """
    cfg = DatabaseConfig()
    app_health = {
        "status": "UP",
        "service": "ExamOpt API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    db_health = {
        "configured_backend": cfg.backend.value,
        "is_cloud": cfg.backend == DatabaseBackend.SUPABASE,
        "connected": False,
        "status": "DOWN"
    }

    try:
        repo = get_repository()
        repo_health = repo.health_check()
        is_connected = repo_health.get("connected", False)
        safe_cfg = cfg.get_safe_status()

        db_health.update({
            "connected": is_connected,
            "status": "UP" if is_connected else "DOWN",
            "sqlite_connected": is_connected if cfg.backend == DatabaseBackend.SQLITE else False,
            "sqlite_path": str(cfg.sqlite_db_path),
            "supabase_cloud_configured": safe_cfg["supabase"]["configured"],
            "active_preset": ACTIVE_STATE["preset"],
            "backend_details": repo_health
        })
    except ConfigurationError as e:
        db_health["status"] = "MISCONFIGURED"
        db_health["error"] = str(e)
    except Exception as e:
        db_health["status"] = "DOWN"
        db_health["error"] = str(e)

    overall_status = "healthy" if db_health["status"] == "UP" else "degraded"

    return {
        "status": overall_status,
        "application": app_health,
        "database": db_health
    }


# -------------------------------------------------------------
# Phase 1 Data Endpoints (Authorized)
# -------------------------------------------------------------
@app.get("/api/data/summary", tags=["Phase 1 Data Foundation"])
def get_data_summary(current_user: AuthUser = Depends(require_authenticated_user)):
    """
    Returns counts of rooms, slots, subjects, student groups, individual students, and backlog students.
    Requires authenticated user authorization.
    """
    try:
        repo = get_repository()
        summary = repo.get_summary()
        cfg = DatabaseConfig()
        summary["active_preset"] = ACTIVE_STATE["preset"]
        summary["is_cloud"] = cfg.backend == DatabaseBackend.SUPABASE
        summary["backend"] = cfg.backend.value
        return summary
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data summary: {str(e)}")


@app.get("/api/data/tables/{table_name}", tags=["Phase 1 Data Foundation"])
def get_table_data(
    table_name: str,
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(require_admin)
):
    """
    Returns all rows for a requested table with pagination support.
    Requires administrator authorization.
    """
    try:
        repo = get_repository()
        return repo.get_table_data(table_name, limit=limit, offset=offset)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve table data: {str(e)}")


@app.post("/api/data/validate", tags=["Phase 1 Data Foundation"])
def validate_dataset(
    req: Optional[ValidateRequest] = None,
    current_user: AuthUser = Depends(require_admin)
):
    """
    Runs validator on the active dataset or a specified preset and returns the validation report.
    When DATABASE_BACKEND=supabase, validates live Supabase data records via repository abstraction.
    Requires administrator authorization.
    """
    preset = req.preset_name if req and req.preset_name else ACTIVE_STATE["preset"]
    cfg = DatabaseConfig()

    if preset == "normal":
        try:
            repo = get_repository()
            report = validate_repository(repo)
        except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
            raise HTTPException(status_code=503, detail=f"Cloud database connection failed during validation: {e}")
    elif preset in ("lab_bottleneck", "capacity_overflow", "invalid_corrupted", "invalid"):
        if cfg.backend == DatabaseBackend.SUPABASE:
            raise HTTPException(
                status_code=400,
                detail=f"Preset '{preset}' cannot be validated against Supabase cloud backend. Preset edge cases are supported in local development (SQLite) mode only."
            )
        preset_file_map = {
            "lab_bottleneck": "edge_case_lab_bottleneck.csv",
            "capacity_overflow": "edge_case_capacity_overflow.csv",
            "invalid_corrupted": "invalid_corrupted_input.csv",
            "invalid": "invalid_corrupted_input.csv"
        }
        report = validate_csv_file(str(DATASETS_DIR / preset_file_map[preset]), table_type="subjects")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown preset '{preset}'. Choose normal, lab_bottleneck, capacity_overflow, or invalid_corrupted."
        )

    ACTIVE_STATE["last_validated"] = report
    return report


@app.post("/api/data/load-preset/{preset_name}", tags=["Phase 1 Data Foundation"])
def load_preset(
    preset_name: str,
    current_user: AuthUser = Depends(require_admin)
):
    """
    Switches active state between presets for demonstration of edge cases.
    Disabled in Supabase cloud mode to prevent silent SQLite fallback or cloud data corruption.
    Requires administrator authorization.
    """
    cfg = DatabaseConfig()
    if cfg.backend == DatabaseBackend.SUPABASE:
        raise HTTPException(
            status_code=400,
            detail="Preset switching is disabled when DATABASE_BACKEND=supabase to prevent silent fallback or modification of cloud production data."
        )

    valid_presets = ["normal", "lab_bottleneck", "capacity_overflow", "invalid_corrupted"]
    if preset_name not in valid_presets:
        raise HTTPException(status_code=400, detail=f"Invalid preset '{preset_name}'. Choose from: {valid_presets}")

    ACTIVE_STATE["preset"] = preset_name

    # If normal, re-seed from clean script if necessary
    if preset_name == "normal":
        import subprocess
        subprocess.run(["python", str(BASE_DIR / "seed_generator.py")], check=True)

    # Immediately validate the newly activated preset
    report = validate_dataset(ValidateRequest(preset_name=preset_name), current_user=current_user)
    return {
        "message": f"Successfully activated preset '{preset_name}'.",
        "active_preset": preset_name,
        "validation_report": report
    }


# -------------------------------------------------------------
# Scheduling & Optimization Endpoints (Phase C/D) — Admin Only
# -------------------------------------------------------------
@app.post("/api/v1/schedules/generate", tags=["Scheduling Engine"])
def generate_schedule(
    req: GenerateScheduleRequest,
    current_user: AuthUser = Depends(require_admin)
):
    """
    Executes a timetable scheduling algorithm and saves the candidate schedule.
    Requires administrator authorization.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    result = service.run_algorithm(req.algorithm)

    run_id = f"RUN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    result["run_id"] = run_id
    ACTIVE_STATE["last_run_id"] = run_id

    # Persist in active repository
    run_record = {
        "run_id": run_id,
        "algorithm": result["algorithm"],
        "status": result["status"],
        "total_exams": result["total_exams"],
        "scheduled_exams": result["scheduled_exams"],
        "unscheduled_exams": result["unscheduled_exams"],
        "hard_conflicts": result["hard_conflicts"],
        "soft_score": result["soft_score"],
        "execution_time_ms": result["execution_time_ms"],
        "metadata": {
            "slots_used": result["slots_used"],
            "room_utilization_pct": result["room_utilization_pct"]
        }
    }

    try:
        repo.save_scheduling_run(run_record, result.get("allocations", []), result.get("conflicts_log", []))
    except DatabaseIntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))

    return result


@app.post("/api/v1/schedules/compare", tags=["Scheduling Engine"])
@app.post("/api/v1/benchmark", tags=["Scheduling Engine"])
def compare_schedules(current_user: AuthUser = Depends(require_admin)):
    """
    Executes First-Fit, Welsh-Powell, and Backtracking on active data and returns side-by-side benchmark.
    Requires administrator authorization.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()
    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    return service.compare_all()


@app.get("/api/v1/schedules", tags=["Scheduling Engine"])
def list_schedule_runs(current_user: AuthUser = Depends(require_admin)):
    """
    Lists historical scheduling runs.
    Draft schedules and runs are confidential; requires administrator authorization.
    """
    repo = get_repository()
    runs = repo.list_scheduling_runs()
    return {"runs": runs}


@app.get("/api/v1/schedules/active-published", tags=["Timetable Access"])
@app.get("/api/v1/timetable/published/active", tags=["Timetable Access"])
@app.get("/api/v1/timetable/published", tags=["Timetable Access"])
@app.get("/api/v1/timetable/current", tags=["Timetable Access"])
@app.get("/api/timetable/current", tags=["Timetable Access"])
def get_active_published_schedule():
    """
    Publicly accessible endpoint: returns the currently active published timetable.
    Does not expose confidential draft runs or unapproved schedules.
    """
    repo = get_repository()
    try:
        details = repo.get_active_published_schedule()
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not details:
        return {
            "status": "NO_PUBLISHED_SCHEDULE",
            "message": "No examination schedule has been published yet. Please contact examination administrators.",
            "allocations": []
        }
    return details


@app.get("/api/v1/rooms", tags=["Rooms"])
def list_examination_rooms():
    """
    Returns list of all available examination rooms with capacity, name, and room type,
    including their scheduled examinations in the active published schedule.
    """
    repo = get_repository()
    rooms_data, _, _, _, _, _ = repo.get_active_dataset_records()
    try:
        active_pub = repo.get_active_published_schedule()
        allocations = active_pub.get("allocations", []) if active_pub else []
    except Exception:
        allocations = []

    res = []
    for r in rooms_data:
        r_id = r["room_id"]
        scheduled = [
            {
                "slot_id": a["slot_id"],
                "subject_id": a["subject_id"],
                "subject_name": a["subject_name"],
                "exam_date": a.get("exam_date"),
                "time_range": a.get("time_range"),
                "enrolled_students": a.get("enrolled_students", 0)
            }
            for a in allocations if a["room_id"].upper() == r_id.upper()
        ]
        res.append({
            "room_id": r_id,
            "name": r.get("name") or r_id,
            "building": r.get("building") or "Academic Block",
            "capacity": int(r["capacity"]),
            "room_type": r.get("room_type", "THEORY"),
            "scheduled_count": len(scheduled),
            "scheduled_exams": scheduled
        })
    return res


@app.get("/api/v1/rooms/{room_id}/seating", tags=["Room Seating"])
def get_room_seating(
    room_id: str,
    slot_id: Optional[str] = Query(None, description="Optional timeslot filter (e.g. D1-M)")
):
    """
    Returns authentic room seating allocations for a room, mapping real enrolled students
    to seat numbers (A1, A2, etc.) based on the active published timetable.
    """
    repo = get_repository()
    try:
        active_pub = repo.get_active_published_schedule()
    except Exception:
        active_pub = None

    allocations = active_pub.get("allocations", []) if active_pub else []

    # Find allocation for room
    room_allocs = [a for a in allocations if a["room_id"].upper() == room_id.upper()]
    available_slots = [
        {
            "slot_id": a["slot_id"],
            "subject_id": a["subject_id"],
            "subject_name": a["subject_name"],
            "exam_date": a.get("exam_date"),
            "time_range": a.get("time_range"),
            "enrolled_students": a.get("enrolled_students", 0),
            "assigned_faculty_name": a.get("assigned_faculty_name")
        }
        for a in room_allocs
    ]

    actual_slot = slot_id if isinstance(slot_id, str) and slot_id.strip() else None
    if actual_slot:
        filtered = [a for a in room_allocs if a["slot_id"].upper() == actual_slot.upper()]
        target_alloc = filtered[0] if filtered else None
    else:
        target_alloc = room_allocs[0] if room_allocs else None

    # Fetch room details
    rooms_data, _, _, _, _, enrollments = repo.get_active_dataset_records()
    room_meta = next((r for r in rooms_data if r["room_id"].upper() == room_id.upper()), None)
    capacity = int(room_meta["capacity"]) if room_meta else (int(target_alloc["room_capacity"]) if target_alloc else 60)
    room_name = room_meta["name"] if room_meta else (target_alloc["room_name"] if target_alloc else room_id)

    # Get students for this subject if allocated
    seated_students = []
    subject_id = target_alloc["subject_id"] if target_alloc else None
    subject_name = target_alloc["subject_name"] if target_alloc else ("No Exam Scheduled in this Slot" if actual_slot else "No Exam Scheduled")

    if target_alloc and subject_id:
        slot_id_val = target_alloc["slot_id"]
        # Find all allocations for this subject and slot to handle multi-room student distribution
        same_allocs = [
            a for a in allocations
            if a.get("subject_id") == subject_id and a.get("slot_id") == slot_id_val
        ]
        same_allocs.sort(key=lambda a: a["room_id"])

        # Collect enrolled students for this subject and sort deterministically
        subject_enrollments = [
            enr for enr in enrollments
            if subject_id in [s.strip() for s in enr.get("enrolled_subject_ids", "").split(",") if s.strip()]
        ]
        subject_enrollments.sort(key=lambda e: e.get("roll_no", ""))

        # Calculate student slice offset if course spans multiple rooms
        offset = 0
        for a in same_allocs:
            if a["room_id"].upper() == room_id.upper():
                break
            offset += int(a.get("assigned_students") or a.get("room_capacity") or 60)

        seated_students = subject_enrollments[offset : offset + capacity]

    # Build seat matrix
    cols_per_row = 8 if capacity <= 80 else 10
    seats = []

    for i in range(capacity):
        row_char = chr(ord('A') + (i // cols_per_row))
        col_num = (i % cols_per_row) + 1
        if i < len(seated_students):
            st = seated_students[i]
            seats.append({
                "row": row_char,
                "col": col_num,
                "seat_id": f"{row_char}{col_num}",
                "status": "occupied",
                "student_roll": st["roll_no"],
                "student_name": st["student_name"]
            })
        else:
            seats.append({
                "row": row_char,
                "col": col_num,
                "seat_id": f"{row_char}{col_num}",
                "status": "available",
                "student_roll": None,
                "student_name": None
            })

    return {
        "room_id": room_id,
        "room_name": room_name,
        "building": room_meta.get("building", "Academic Block 11") if room_meta else "Academic Block 11",
        "room_type": room_meta.get("room_type", "THEORY") if room_meta else "THEORY",
        "capacity": capacity,
        "subject_id": subject_id,
        "subject_code": subject_id,
        "subject_name": subject_name,
        "program": target_alloc.get("program") if target_alloc else None,
        "semester": target_alloc.get("semester") if target_alloc else None,
        "assigned_faculty_name": target_alloc.get("assigned_faculty_name") if target_alloc else None,
        "assigned_faculty_id": target_alloc.get("assigned_faculty_id") if target_alloc else None,
        "slot_id": target_alloc["slot_id"] if target_alloc else actual_slot,
        "exam_date": target_alloc["exam_date"] if target_alloc else None,
        "time_range": target_alloc["time_range"] if target_alloc else None,
        "occupied_count": len(seated_students),
        "available_count": max(0, capacity - len(seated_students)),
        "utilization_pct": round(len(seated_students) / max(1, capacity) * 100, 1),
        "available_slots": available_slots,
        "seats": seats
    }


@app.get("/api/v1/schedules/{run_id}", tags=["Scheduling Engine"])
def get_schedule_run_details(
    run_id: str,
    current_user: AuthUser = Depends(require_admin)
):
    """
    Returns allocations and details for a specific run.
    Confidential diagnostic and draft run details require administrator authorization.
    """
    repo = get_repository()
    details = repo.get_schedule_run_details(run_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Schedule run '{run_id}' not found.")
    return details


@app.post("/api/v1/schedules/{run_id}/publish", tags=["Publishing"])
def publish_schedule(
    run_id: str,
    current_user: AuthUser = Depends(require_admin)
):
    """
    Atomically publishes a candidate schedule (rejects if hard conflicts exist).
    Requires administrator authorization.
    """
    repo = get_repository()
    try:
        return repo.publish_schedule(run_id)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except DatabaseIntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))


# -------------------------------------------------------------
# Student & Faculty Personalized Timetable Endpoints (Scoped Access)
# -------------------------------------------------------------
@app.get("/api/v1/timetable/student", tags=["Mobile Timetable Access"])
def get_student_timetable(
    roll_no: Optional[str] = Query(None, description="e.g. GLA26-BCA-0001"),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Returns the personalized examination schedule for an authorized student.
    Enforces isolation: students can access only their own timetable.
    """
    authorized_roll_no = resolve_student_authorization(roll_no, current_user)
    repo = get_repository()

    try:
        res = repo.get_student_timetable(authorized_roll_no)
        if not res:
            raise HTTPException(status_code=404, detail=f"Student with Roll Number '{authorized_roll_no}' not found.")
        return res
    except (DatabaseConnectionError, DatabaseAuthenticationError) as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/v1/timetable/faculty", tags=["Mobile Timetable Access"])
def get_faculty_timetable(
    faculty_id: Optional[str] = Query(None, description="e.g. FAC-101"),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Returns assigned examination duties for an authorized faculty member.
    Enforces isolation: faculty can access only their own examination duties.
    """
    authorized_faculty_id = resolve_faculty_authorization(faculty_id, current_user)
    repo = get_repository()

    try:
        res = repo.get_faculty_timetable(authorized_faculty_id)
        if not res:
            raise HTTPException(status_code=404, detail=f"Faculty with ID '{authorized_faculty_id}' not found.")
        if "duties" in res and "schedule" not in res:
            res["schedule"] = res["duties"]
        return res
    except DatabaseConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/v1/timetable/export/csv", tags=["Exports"])
def export_timetable_csv(
    run_id: Optional[str] = None,
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Downloads examination timetable as a CSV file.
    Exporting specific draft runs requires administrator privileges.
    Exporting active published schedule requires authenticated user.
    """
    if run_id and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators can export candidate or draft scheduling runs."
        )

    repo = get_repository()
    if run_id:
        details = repo.get_schedule_run_details(run_id)
    else:
        details = repo.get_active_published_schedule()

    if not details or not details.get("allocations"):
        raise HTTPException(status_code=404, detail="No schedule allocations available for export.")

    csv_data = ExporterService.export_timetable_csv(details.get("allocations", []))
    filename = f"ExamOpt_Timetable_{run_id or 'Published'}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# -------------------------------------------------------------
# Static Single Page Application (SPA) Serving
# -------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        # Don't intercept API routes or documentation
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "ExamOpt API Server is running. Frontend build in progress."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
