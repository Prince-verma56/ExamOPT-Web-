"""
ExamOpt — Secure API Authorization & Role-Based Access Control (RBAC) Module
Problem Statement C10: Intelligent Examination Timetable Optimization System

Provides role enforcement across API routes:
- ADMIN: Schedule generation, publication, database inspection, and full management.
- FACULTY: Assigned examination duties only (isolated by faculty_id).
- STUDENT: Enrolled course timetables only (isolated by student_roll_no).
- PUBLIC: Observable health metrics and published active timetables only.
"""

import os
import json
import time
import uuid
import hmac
import hashlib
import base64
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

from fastapi import Request, HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security_scheme = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"


@dataclass
class AuthUser:
    user_id: str
    role: UserRole
    student_roll_no: Optional[str] = None
    faculty_id: Optional[str] = None
    email: Optional[str] = None

    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def is_faculty(self) -> bool:
        return self.role == UserRole.FACULTY

    def is_student(self) -> bool:
        return self.role == UserRole.STUDENT


def _b64url_decode(s: str) -> bytes:
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + padding)


def decode_hs256_jwt(token: str, secret: str) -> Dict[str, Any]:
    """Decodes and validates a standard HS256 JWT using stdlib crypto."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    header_b64, payload_b64, sig_b64 = parts

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid JWT signature")

    payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if "exp" in payload and payload["exp"] < time.time():
        raise ValueError("Token has expired")
    return payload


def create_mock_jwt(payload: Dict[str, Any], secret: str = "examopt-dev-secret") -> str:
    """Helper for testing: creates a valid HS256 JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode("utf-8")).decode("utf-8").rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    s_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    return f"{h_b64}.{p_b64}.{s_b64}"


EXAMOPT_JWT_SECRET = os.getenv("EXAMOPT_JWT_SECRET", os.getenv("SUPABASE_JWT_SECRET", "examopt-jwt-production-grade-secret-key-2026-c10"))

# Server-side Token Revocation Store
REVOKED_TOKENS = set()

def _get_sqlite_db_path() -> Optional[Path]:
    p = Path(__file__).resolve().parent.parent / "examopt.db"
    return p if p.exists() else None

def revoke_token(token: str) -> None:
    """Marks a token as revoked server-side upon logout."""
    if token and isinstance(token, str):
        clean_token = token.strip()
        REVOKED_TOKENS.add(clean_token)
        db_path = _get_sqlite_db_path()
        if db_path:
            try:
                import sqlite3
                with sqlite3.connect(db_path) as conn:
                    conn.execute(
                        "CREATE TABLE IF NOT EXISTS token_blacklist (token TEXT PRIMARY KEY, revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
                    )
                    conn.execute("INSERT OR IGNORE INTO token_blacklist (token) VALUES (?)", (clean_token,))
            except Exception:
                pass

def is_token_revoked(token: str) -> bool:
    """Checks whether a token has been revoked server-side."""
    if not token or not isinstance(token, str):
        return False
    clean_token = token.strip()
    if clean_token in REVOKED_TOKENS:
        return True
    db_path = _get_sqlite_db_path()
    if db_path:
        try:
            import sqlite3
            with sqlite3.connect(db_path) as conn:
                cur = conn.cursor()
                table_check = cur.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='token_blacklist'"
                ).fetchone()
                if table_check:
                    row = cur.execute("SELECT 1 FROM token_blacklist WHERE token = ?", (clean_token,)).fetchone()
                    if row:
                        REVOKED_TOKENS.add(clean_token)
                        return True
        except Exception:
            pass
    return False

def clear_revoked_tokens() -> None:
    """Clears the revocation cache (used in test teardown)."""
    REVOKED_TOKENS.clear()
    db_path = _get_sqlite_db_path()
    if db_path:
        try:
            import sqlite3
            with sqlite3.connect(db_path) as conn:
                table_check = conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='token_blacklist'"
                ).fetchone()
                if table_check:
                    conn.execute("DELETE FROM token_blacklist")
        except Exception:
            pass


def create_access_token(
    user_id: str,
    role: UserRole,
    student_roll_no: Optional[str] = None,
    faculty_id: Optional[str] = None,
    email: Optional[str] = None,
    name: Optional[str] = None,
    expires_in_seconds: int = 86400 * 7
) -> str:
    """Creates a signed HS256 JWT access token."""
    now = time.time()
    payload = {
        "jti": str(uuid.uuid4()),
        "sub": user_id,
        "role": role.value,
        "student_roll_no": student_roll_no,
        "faculty_id": faculty_id,
        "email": email,
        "name": name,
        "iat": int(now),
        "exp": int(now + expires_in_seconds)
    }
    return create_mock_jwt(payload, EXAMOPT_JWT_SECRET)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthUser:
    """
    Authenticates the request caller via Bearer token, configured API Key,
    or local development headers.
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    admin_api_key = os.getenv("EXAMOPT_ADMIN_API_KEY", os.getenv("ADMIN_API_KEY", "")).strip()

    # 1. Check API Key header (X-API-Key)
    api_key_header = request.headers.get("X-API-Key", "").strip()
    if admin_api_key and api_key_header == admin_api_key:
        return AuthUser(user_id="admin-api-key", role=UserRole.ADMIN, email="admin@examopt.internal")

    token = credentials.credentials if credentials else None
    if not token and request.headers.get("Authorization"):
        auth_hdr = request.headers.get("Authorization", "").strip()
        if auth_hdr.lower().startswith("bearer "):
            token = auth_hdr[7:].strip()
    if not token and request.query_params.get("token"):
        token = request.query_params.get("token", "").strip()

    # 2. Check Bearer token if provided
    if token:
        # Check if token was revoked server-side via logout
        if is_token_revoked(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Check against admin API key passed in Authorization header
        if admin_api_key and token == admin_api_key:
            return AuthUser(user_id="admin-api-key", role=UserRole.ADMIN, email="admin@examopt.internal")

        # Try native ExamOpt JWT Secret first
        for secret_candidate in [EXAMOPT_JWT_SECRET, os.getenv("SUPABASE_JWT_SECRET", "").strip()]:
            if not secret_candidate:
                continue
            try:
                payload = decode_hs256_jwt(token, secret_candidate)
                user_id = payload.get("sub", "unknown")
                email = payload.get("email")
                app_meta = payload.get("app_metadata", {})
                user_meta = payload.get("user_metadata", {})

                # Determine role from JWT claims
                raw_role = (
                    payload.get("role")
                    or app_meta.get("role")
                    or user_meta.get("role")
                    or "authenticated"
                ).upper()

                if raw_role in ("SERVICE_ROLE", "ADMIN", "SUPERADMIN"):
                    role = UserRole.ADMIN
                elif raw_role == "FACULTY":
                    role = UserRole.FACULTY
                else:
                    role = UserRole.STUDENT

                return AuthUser(
                    user_id=user_id,
                    role=role,
                    student_roll_no=payload.get("student_roll_no") or user_meta.get("student_roll_no") or user_meta.get("roll_no"),
                    faculty_id=payload.get("faculty_id") or user_meta.get("faculty_id"),
                    email=email
                )
            except ValueError:
                pass

        # In non-production environments, support recognized mock tokens
        if env != "production":
            if token in ("mock-admin-token", "dev-admin-token", "test-admin-token"):
                return AuthUser(user_id="admin-dev", role=UserRole.ADMIN, email="admin@gla.ac.in")
            if token.startswith("mock-student-"):
                roll = token[len("mock-student-"):] or request.headers.get("X-ExamOpt-RollNo", "GLA26-BCA-0001")
                return AuthUser(user_id=f"stu-{roll}", role=UserRole.STUDENT, student_roll_no=roll, email=f"{roll.lower()}@gla.ac.in")
            if token.startswith("dev-student-"):
                roll = token[len("dev-student-"):] or request.headers.get("X-ExamOpt-RollNo", "GLA26-BCA-0001")
                return AuthUser(user_id=f"stu-{roll}", role=UserRole.STUDENT, student_roll_no=roll, email=f"{roll.lower()}@gla.ac.in")
            if token.startswith("mock-faculty-"):
                fac_id = token[len("mock-faculty-"):] or request.headers.get("X-ExamOpt-FacultyId", "FAC-101")
                return AuthUser(user_id=f"fac-{fac_id}", role=UserRole.FACULTY, faculty_id=fac_id, email=f"{fac_id.lower()}@gla.ac.in")
            if token.startswith("dev-faculty-"):
                fac_id = token[len("dev-faculty-"):] or request.headers.get("X-ExamOpt-FacultyId", "FAC-101")
                return AuthUser(user_id=f"fac-{fac_id}", role=UserRole.FACULTY, faculty_id=fac_id, email=f"{fac_id.lower()}@gla.ac.in")

    # 3. In non-production development mode, allow role simulation headers for automated testing & offline UI
    if env != "production":
        role_header = request.headers.get("X-ExamOpt-Role", "").strip().upper()
        if role_header:
            if role_header == "ADMIN":
                return AuthUser(user_id="dev-admin", role=UserRole.ADMIN, email="admin@examopt.local")
            elif role_header == "FACULTY":
                fac_id = request.headers.get("X-ExamOpt-FacultyId", "FAC-101").strip()
                return AuthUser(user_id=f"dev-fac-{fac_id}", role=UserRole.FACULTY, faculty_id=fac_id)
            elif role_header == "STUDENT":
                roll_no = request.headers.get("X-ExamOpt-RollNo", "GLA26-BCA-0001").strip()
                return AuthUser(user_id=f"dev-stu-{roll_no}", role=UserRole.STUDENT, student_roll_no=roll_no)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid Bearer token or authorization header.",
        headers={"WWW-Authenticate": "Bearer"}
    )


def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[AuthUser]:
    """Returns AuthUser if caller provided valid credentials, or None if unauthenticated."""
    try:
        return get_current_user(request, credentials)
    except HTTPException:
        return None


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Enforces that the authenticated user possesses administrator authorization."""
    if not user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required for this operation."
        )
    return user


def require_authenticated_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Requires any authenticated user (Admin, Faculty, or Student)."""
    return user


def resolve_student_authorization(
    requested_roll_no: Optional[str],
    user: AuthUser
) -> str:
    """
    Enforces student isolation:
    - Admins can inspect any student's timetable.
    - Students can access ONLY their own timetable.
    - Faculty cannot inspect individual student timetables.
    """
    if user.is_admin():
        if not requested_roll_no:
            raise HTTPException(status_code=400, detail="Administrator query must specify '?roll_no=...'.")
        return requested_roll_no.strip()

    if user.is_student():
        authorized_roll = user.student_roll_no
        if not authorized_roll:
            raise HTTPException(status_code=403, detail="Student profile is not linked to an authorized roll number.")
        if requested_roll_no and requested_roll_no.strip().upper() != authorized_roll.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You are only authorized to view timetable for '{authorized_roll}'."
            )
        return authorized_roll

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: Faculty accounts cannot access individual student timetables."
    )


def resolve_faculty_authorization(
    requested_faculty_id: Optional[str],
    user: AuthUser
) -> str:
    """
    Enforces faculty isolation:
    - Admins can inspect any faculty member's duties.
    - Faculty can access ONLY their own duties.
    - Students cannot inspect faculty duties.
    """
    if user.is_admin():
        if not requested_faculty_id:
            raise HTTPException(status_code=400, detail="Administrator query must specify '?faculty_id=...'.")
        return requested_faculty_id.strip()

    if user.is_faculty():
        authorized_fac = user.faculty_id
        if not authorized_fac:
            raise HTTPException(status_code=403, detail="Faculty profile is not linked to an authorized faculty ID.")
        if requested_faculty_id and requested_faculty_id.strip().upper() != authorized_fac.strip().upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You are only authorized to view duties for '{authorized_fac}'."
            )
        return authorized_fac

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Forbidden: Student accounts cannot access faculty examination duties."
    )
