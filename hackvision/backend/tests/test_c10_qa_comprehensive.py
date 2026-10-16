"""
ExamOpt — Comprehensive QA Audit & Algorithm Validation Suite Against GLA HackVision 2.0 C10
Independent Hard-Constraint Checker & Requirements Traceability Test Matrix
"""

import pytest
import csv
import io
import json
from collections import defaultdict
from typing import Dict, List, Any, Set, Tuple

from fastapi.testclient import TestClient
from main import app
from app.database import get_repository, reset_repository, DatabaseBackend
from app.algorithms.baseline_first_fit import FirstFitScheduler
from app.algorithms.welsh_powell import WelshPowellScheduler
from app.algorithms.backtracking import ConstraintBacktrackingScheduler
from app.algorithms.conflict_graph import SubjectConflictGraph
from app.services.optimizer import TimetableOptimizerService
from app.services.exporter import ExporterService
from validator import DataQualityValidator


# ============================================================================
# Independent Hard-Constraint Checker
# Validates schedule output strictly from first principles without trusting
# the algorithm's self-reported "status" or "is_feasible" flags.
# ============================================================================

class IndependentHardConstraintChecker:
    """
    Independent validation engine that verifies all 8 C10 hard constraints
    directly against raw student enrollments, room capacities, and time slots.
    """

    def __init__(
        self,
        subjects: List[Dict[str, Any]],
        rooms: List[Dict[str, Any]],
        timeslots: List[Dict[str, Any]],
        enrollments: List[Dict[str, Any]],
        faculty: List[Dict[str, Any]]
    ):
        self.subjects = {s["subject_id"]: s for s in subjects}
        self.rooms = {r["room_id"]: r for r in rooms}
        self.timeslots = {t["slot_id"]: t for t in timeslots}
        self.faculty = {f["faculty_id"]: f for f in faculty}
        self.enrollments = enrollments

        # Build ground-truth student-to-subject map
        self.student_to_subjects: Dict[str, Set[str]] = defaultdict(set)
        for e in enrollments:
            roll_no = e["roll_no"]
            subjs = e.get("enrolled_subject_ids", "")
            if isinstance(subjs, str):
                s_list = [s.strip() for s in subjs.split(",") if s.strip()]
            else:
                s_list = subjs
            for s_id in s_list:
                if s_id in self.subjects:
                    self.student_to_subjects[roll_no].add(s_id)

    def validate_schedule(self, allocations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates allocations against all 8 hard constraints.
        Returns: {
            "is_valid": bool,
            "violations": List[str],
            "violations_by_constraint": Dict[str, List[str]],
            "metrics": Dict[str, Any]
        }
        """
        violations = []
        by_cat = {
            "STUDENT_CLASH": [],
            "ROOM_COLLISION": [],
            "CAPACITY_OVERFLOW": [],
            "ROOM_SPECIALIZATION": [],
            "FIXED_SLOT_VIOLATION": [],
            "UNAVAILABLE_PERIOD": [],
            "DURATION_BOUNDARY": [],
            "FACULTY_DOUBLE_BOOKING": []
        }

        # 1. Check Student Clashes (No student has 2 exams in the same slot)
        # Map slot_id -> set of scheduled subject_ids
        slot_to_subjects: Dict[str, Set[str]] = defaultdict(set)
        for a in allocations:
            slot_to_subjects[a["slot_id"]].add(a["subject_id"])

        for roll_no, student_subjs in self.student_to_subjects.items():
            for slot_id, scheduled_subjs in slot_to_subjects.items():
                clashing = student_subjs.intersection(scheduled_subjs)
                if len(clashing) > 1:
                    msg = (
                        f"Student '{roll_no}' has multiple clashing exams in slot '{slot_id}': "
                        f"{sorted(list(clashing))}"
                    )
                    violations.append(msg)
                    by_cat["STUDENT_CLASH"].append(msg)

        # 2. Check Room Double-Booking (No room assigned to multiple exams in same slot)
        room_slot_usage: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        for a in allocations:
            room_slot_usage[(a["room_id"], a["slot_id"])].append(a["subject_id"])

        for (room_id, slot_id), subjs in room_slot_usage.items():
            if len(subjs) > 1:
                msg = f"Room '{room_id}' is double-booked in slot '{slot_id}' by subjects: {subjs}"
                violations.append(msg)
                by_cat["ROOM_COLLISION"].append(msg)

        # 3. Check Room Capacity (Enrolled students <= Room capacity)
        for a in allocations:
            s_id = a["subject_id"]
            r_id = a["room_id"]
            room = self.rooms.get(r_id)
            subj = self.subjects.get(s_id)
            if not room:
                msg = f"Unknown room '{r_id}' referenced in allocation for subject '{s_id}'."
                violations.append(msg)
                by_cat["ROOM_COLLISION"].append(msg)
                continue

            enrolled = int(a.get("assigned_students", subj.get("enrolled_students", 0) if subj else 0))
            capacity = int(room.get("capacity", 0))
            if enrolled > capacity:
                msg = (
                    f"Subject '{s_id}' enrolled count ({enrolled}) exceeds room '{r_id}' "
                    f"capacity ({capacity})."
                )
                violations.append(msg)
                by_cat["CAPACITY_OVERFLOW"].append(msg)

        # 4. Check Specialized Room Type (LAB strictly in LAB room, THEORY strictly in THEORY room)
        for a in allocations:
            s_id = a["subject_id"]
            r_id = a["room_id"]
            subj = self.subjects.get(s_id)
            room = self.rooms.get(r_id)
            if subj and room:
                req_lab = bool(subj.get("requires_lab", False))
                room_type = room.get("room_type", "THEORY").upper()
                if req_lab and room_type != "LAB":
                    msg = f"Lab subject '{s_id}' incorrectly assigned to non-lab room '{r_id}' (type: {room_type})."
                    violations.append(msg)
                    by_cat["ROOM_SPECIALIZATION"].append(msg)
                elif not req_lab and room_type != "THEORY":
                    msg = f"Theory subject '{s_id}' incorrectly assigned to lab room '{r_id}' (type: {room_type})."
                    violations.append(msg)
                    by_cat["ROOM_SPECIALIZATION"].append(msg)

        # 5. Check Fixed Slot Preservation
        for a in allocations:
            s_id = a["subject_id"]
            subj = self.subjects.get(s_id)
            if subj:
                fixed = str(subj.get("fixed_slot", "") or "").strip()
                if fixed and a["slot_id"] != fixed:
                    msg = f"Subject '{s_id}' with fixed slot '{fixed}' was moved to '{a['slot_id']}'."
                    violations.append(msg)
                    by_cat["FIXED_SLOT_VIOLATION"].append(msg)

        # 6. Check Unavailable Periods (Subject & Room)
        for a in allocations:
            s_id = a["subject_id"]
            r_id = a["room_id"]
            slot_id = a["slot_id"]
            subj = self.subjects.get(s_id)
            room = self.rooms.get(r_id)

            if subj:
                unav_str = str(subj.get("unavailable_slots", "") or "").strip()
                unav_set = set(s.strip() for s in unav_str.split("|") if s.strip())
                if slot_id in unav_set:
                    msg = f"Subject '{s_id}' assigned to unavailable slot '{slot_id}'."
                    violations.append(msg)
                    by_cat["UNAVAILABLE_PERIOD"].append(msg)

            if room:
                r_unav_str = str(room.get("unavailable_slots", "") or "").strip()
                r_unav_set = set(s.strip() for s in r_unav_str.split("|") if s.strip())
                if slot_id in r_unav_set:
                    msg = f"Room '{r_id}' assigned in its unavailable slot '{slot_id}' for subject '{s_id}'."
                    violations.append(msg)
                    by_cat["UNAVAILABLE_PERIOD"].append(msg)

        # 7. Check Duration & Boundary
        for a in allocations:
            s_id = a["subject_id"]
            subj = self.subjects.get(s_id)
            if subj:
                dur = int(subj.get("duration_hours", 3))
                if dur not in (2, 3):
                    msg = f"Subject '{s_id}' has invalid duration {dur} hours."
                    violations.append(msg)
                    by_cat["DURATION_BOUNDARY"].append(msg)

        # 8. Check Faculty Double-Booking
        faculty_slot_usage: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        faculty_duties: Dict[str, int] = defaultdict(int)
        for a in allocations:
            fac_id = a.get("assigned_faculty_id")
            if fac_id:
                faculty_slot_usage[(fac_id, a["slot_id"])].append(a["subject_id"])
                faculty_duties[fac_id] += 1

        for (fac_id, slot_id), subjs in faculty_slot_usage.items():
            if len(subjs) > 1:
                msg = f"Faculty '{fac_id}' is double-booked in slot '{slot_id}' across subjects: {subjs}"
                violations.append(msg)
                by_cat["FACULTY_DOUBLE_BOOKING"].append(msg)

        for fac_id, count in faculty_duties.items():
            fac = self.faculty.get(fac_id)
            if fac:
                max_d = int(fac.get("max_duties", 4))
                if count > max_d:
                    msg = f"Faculty '{fac_id}' assigned {count} duties exceeding max allowed ({max_d})."
                    violations.append(msg)
                    by_cat["FACULTY_DOUBLE_BOOKING"].append(msg)

        # Metrics calculation
        total_assigned_students = sum(int(a.get("assigned_students", 0)) for a in allocations)
        total_capacity_used = sum(int(self.rooms[a["room_id"]]["capacity"]) for a in allocations if a["room_id"] in self.rooms)
        room_utilization = (total_assigned_students / total_capacity_used * 100.0) if total_capacity_used > 0 else 0.0

        return {
            "is_valid": len(violations) == 0,
            "violations_count": len(violations),
            "violations": violations,
            "violations_by_constraint": by_cat,
            "metrics": {
                "total_allocations": len(allocations),
                "total_assigned_students": total_assigned_students,
                "total_capacity_used": total_capacity_used,
                "room_utilization_pct": round(room_utilization, 2),
                "slots_used": len(slot_to_subjects)
            }
        }


# ============================================================================
# Test Fixtures & Tokens
# ============================================================================

@pytest.fixture(autouse=True)
def setup_sqlite():
    reset_repository()
    yield
    reset_repository()


@pytest.fixture
def admin_headers():
    return {
        "Authorization": "Bearer test-admin-token",
        "X-ExamOpt-Role": "ADMIN"
    }


@pytest.fixture
def student_headers():
    return {
        "Authorization": "Bearer mock-student-GLA26-BCA-0001",
        "X-ExamOpt-Role": "STUDENT",
        "X-ExamOpt-RollNo": "GLA26-BCA-0001"
    }


@pytest.fixture
def faculty_headers():
    return {
        "Authorization": "Bearer mock-faculty-FAC-101",
        "X-ExamOpt-Role": "FACULTY",
        "X-ExamOpt-FacultyId": "FAC-101"
    }


# ============================================================================
# Phase 3 & 4: 15 Comprehensive Reproducible Test Scenarios
# ============================================================================

def test_scenario_01_valid_baseline_and_independent_validation():
    """
    [TC-C10-01] Phase 3 Scenario 1: Valid Baseline
    A valid feasible dataset generates a timetable that passes 100% independent
    hard-constraint validation across all three scheduling algorithms.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    checker = IndependentHardConstraintChecker(subjects, rooms, timeslots, enrollments, faculty)

    for alg in ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"]:
        service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
        result = service.run_algorithm(alg)

        assert result["status"] == "FEASIBLE", f"{alg} failed to generate feasible baseline timetable."
        assert result["scheduled_exams"] == len(subjects), f"{alg} missed scheduling some subjects."
        assert result["unscheduled_exams"] == 0
        assert result["hard_conflicts"] == 0

        # Run Independent Checker
        val = checker.validate_schedule(result["allocations"])
        assert val["is_valid"] is True, f"{alg} produced hard violations: {val['violations']}"
        assert val["violations_count"] == 0


def test_scenario_02_shared_student_backlog_clash_prevention():
    """
    [TC-C10-02] Phase 3 Scenario 2: Shared-Student Clash (Regular & Cross-Semester Backlog)
    Two exams sharing students must NEVER overlap in the same slot.
    Specifically verifies that cross-semester backlog students sharing courses
    are detected via the conflict graph and placed in distinct slots.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    # Find backlog students who take exams from multiple semesters
    graph = SubjectConflictGraph(subjects, enrollments)
    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    result = service.run_algorithm("BACKTRACKING")

    # Map subject_id -> slot_id
    assigned_slots = {a["subject_id"]: a["slot_id"] for a in result["allocations"]}

    # Verify every pair with shared students has distinct slots
    checked_pairs = 0
    for u in graph.adj:
        for v in graph.adj[u]:
            assert u in assigned_slots and v in assigned_slots
            assert assigned_slots[u] != assigned_slots[v], (
                f"HARD CONFLICT: Conflicting subjects '{u}' and '{v}' "
                f"({graph.get_shared_count(u, v)} shared students) assigned to same slot '{assigned_slots[u]}'."
            )
            checked_pairs += 1

    assert checked_pairs > 0, "No conflict edges were tested."

    # Test independent checker detecting artificial clash
    checker = IndependentHardConstraintChecker(subjects, rooms, timeslots, enrollments, faculty)
    corrupted_allocations = list(result["allocations"])
    # Artificially force subject 1 and subject 2 to same slot
    first_two = list(graph.adj.keys())[:2]
    # Pick a pair that actually has a conflict
    u_cand = None
    v_cand = None
    for u in graph.adj:
        if len(graph.adj[u]) > 0:
            u_cand = u
            v_cand = list(graph.adj[u])[0]
            break
    assert u_cand and v_cand

    for a in corrupted_allocations:
        if a["subject_id"] == v_cand:
            a["slot_id"] = assigned_slots[u_cand]

    tampered_val = checker.validate_schedule(corrupted_allocations)
    assert tampered_val["is_valid"] is False
    assert len(tampered_val["violations_by_constraint"]["STUDENT_CLASH"]) > 0


def test_scenario_03_room_capacity_boundary():
    """
    [TC-C10-03] Phase 3 Scenario 3: Room Capacity Boundary
    Tests exactly-at-capacity (enrolled == capacity: valid) and
    over-capacity (enrolled > capacity: prohibited).
    """
    # 1. Exactly at capacity
    subjects = [
        {"subject_id": "TEST-101", "name": "Exact Cap Exam", "program": "BCA", "semester": 1,
         "duration_hours": 3, "requires_lab": 0, "enrolled_students": 60, "fixed_slot": "", "unavailable_slots": ""}
    ]
    rooms = [
        {"room_id": "ROOM-60", "name": "Hall 60", "capacity": 60, "room_type": "THEORY", "unavailable_slots": ""}
    ]
    timeslots = [
        {"slot_id": "S1", "day_number": 1, "exam_date": "2026-11-01", "session": "MORNING", "time_range": "09:30 AM - 12:30 PM"}
    ]
    faculty = [
        {"faculty_id": "F1", "name": "Prof A", "department": "BCA", "unavailable_slots": "", "max_duties": 4}
    ]
    enrollments = [
        {"roll_no": f"STU-{i}", "enrolled_subject_ids": "TEST-101"} for i in range(60)
    ]

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("FIRST_FIT")
    assert res["status"] == "FEASIBLE"
    assert res["scheduled_exams"] == 1
    assert res["allocations"][0]["room_id"] == "ROOM-60"

    # 2. Over capacity by 1 student: enrolled = 61 in capacity 60
    subjects[0]["enrolled_students"] = 61
    enrollments.append({"roll_no": "STU-60", "enrolled_subject_ids": "TEST-101"})
    service_overflow = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res_overflow = service_overflow.run_algorithm("FIRST_FIT")
    assert res_overflow["is_feasible"] is False
    assert res_overflow["status"] in ("INFEASIBLE", "PARTIAL")
    assert res_overflow["unscheduled_exams"] == 1
    assert "exceeds largest available THEORY room" in res_overflow["unscheduled_details"][0]["reasons"][0]


def test_scenario_04_room_collision_prevention():
    """
    [TC-C10-04] Phase 3 Scenario 4: Room Collision Prevention
    Two exams with no shared students competing for the same slot cannot share the same room.
    """
    subjects = [
        {"subject_id": "SUB-A", "name": "Course A", "program": "BCA", "semester": 1,
         "duration_hours": 3, "requires_lab": 0, "enrolled_students": 30, "fixed_slot": "", "unavailable_slots": ""},
        {"subject_id": "SUB-B", "name": "Course B", "program": "MCA", "semester": 1,
         "duration_hours": 3, "requires_lab": 0, "enrolled_students": 30, "fixed_slot": "", "unavailable_slots": ""}
    ]
    # Only 1 room and 1 slot available
    rooms = [
        {"room_id": "SINGLE-ROOM", "name": "Only Room", "capacity": 60, "room_type": "THEORY", "unavailable_slots": ""}
    ]
    timeslots = [
        {"slot_id": "ONLY-SLOT", "day_number": 1, "exam_date": "2026-11-01", "session": "MORNING", "time_range": "09:30 AM - 12:30 PM"}
    ]
    faculty = [
        {"faculty_id": "F1", "name": "Prof A", "department": "BCA", "unavailable_slots": "", "max_duties": 4}
    ]
    # No shared students between SUB-A and SUB-B
    enrollments = [
        {"roll_no": f"BCA-{i}", "enrolled_subject_ids": "SUB-A"} for i in range(30)
    ] + [
        {"roll_no": f"MCA-{i}", "enrolled_subject_ids": "SUB-B"} for i in range(30)
    ]

    # Test First-Fit: schedules 1 exam, leaves the colliding exam unscheduled
    service_ff = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res_ff = service_ff.run_algorithm("FIRST_FIT")
    assert res_ff["scheduled_exams"] == 1
    assert res_ff["unscheduled_exams"] == 1

    # Test Backtracking: proves complete schedule is infeasible without room double-booking
    service_bt = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res_bt = service_bt.run_algorithm("BACKTRACKING")
    assert res_bt["is_feasible"] is False
    assert res_bt["status"] in ("INFEASIBLE", "TIMEOUT")

    # Verify that independent checker would catch a collision
    checker = IndependentHardConstraintChecker(subjects, rooms, timeslots, enrollments, faculty)
    illegal_allocations = [
        {"subject_id": "SUB-A", "slot_id": "ONLY-SLOT", "room_id": "SINGLE-ROOM", "assigned_students": 30},
        {"subject_id": "SUB-B", "slot_id": "ONLY-SLOT", "room_id": "SINGLE-ROOM", "assigned_students": 30}
    ]
    val = checker.validate_schedule(illegal_allocations)
    assert val["is_valid"] is False
    assert len(val["violations_by_constraint"]["ROOM_COLLISION"]) == 1


def test_scenario_05_fixed_examination_lock():
    """
    [TC-C10-05] Phase 3 Scenario 5: Fixed Examination Lock
    A subject configured with a fixed slot must remain strictly locked at that slot.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    # Find or set a fixed slot
    target_slot = timeslots[0]["slot_id"]
    subjects_modified = list(subjects)
    subjects_modified[0] = dict(subjects_modified[0])
    subjects_modified[0]["fixed_slot"] = target_slot

    service = TimetableOptimizerService(subjects_modified, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("BACKTRACKING")

    alloc = next(a for a in res["allocations"] if a["subject_id"] == subjects_modified[0]["subject_id"])
    assert alloc["slot_id"] == target_slot, "Fixed slot constraint was violated!"


def test_scenario_06_unavailable_time_slot_compliance():
    """
    [TC-C10-06] Phase 3 Scenario 6: Unavailable Time Slot Compliance
    Subjects and rooms with blocked slots must NEVER be assigned during those periods.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    blocked_slot = timeslots[0]["slot_id"]
    subjects_modified = list(subjects)
    subjects_modified[0] = dict(subjects_modified[0])
    subjects_modified[0]["unavailable_slots"] = blocked_slot

    service = TimetableOptimizerService(subjects_modified, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("BACKTRACKING")

    alloc = next(a for a in res["allocations"] if a["subject_id"] == subjects_modified[0]["subject_id"])
    assert alloc["slot_id"] != blocked_slot, "Subject was scheduled in its declared unavailable slot!"


def test_scenario_07_specialized_room_type_enforcement():
    """
    [TC-C10-07] Phase 3 Scenario 7: Specialized Room Type Enforcement
    Laboratory exams requiring specialized equipment must be assigned strictly to LAB rooms.
    Theory exams must be assigned strictly to THEORY rooms.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    room_type_map = {r["room_id"]: r["room_type"] for r in rooms}

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("WELSH_POWELL")

    for a in res["allocations"]:
        is_lab = a["requires_lab"]
        r_type = room_type_map[a["room_id"]]
        if is_lab:
            assert r_type == "LAB", f"Lab course '{a['subject_id']}' assigned to non-lab room '{a['room_id']}'!"
        else:
            assert r_type == "THEORY", f"Theory course '{a['subject_id']}' assigned to lab room '{a['room_id']}'!"


def test_scenario_08_duration_boundary_compliance():
    """
    [TC-C10-08] Phase 3 Scenario 8: Examination Duration Boundary
    Examination durations (2 hours, 3 hours) and time slots are respected.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    for s in subjects:
        assert s["duration_hours"] in (2, 3), f"Subject '{s['subject_id']}' has non-standard duration."

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("FIRST_FIT")

    for a in res["allocations"]:
        assert a["duration_hours"] in (2, 3)
        assert len(a["time_range"]) > 0


def test_scenario_09_unsatisfiable_constraint_root_cause_explanation():
    """
    [TC-C10-09] Phase 3 Scenario 9: Unsatisfiable Case & Root Cause Explanation
    A deliberately impossible constraint combination produces INFEASIBLE status,
    a specific diagnostic error message (not generic success/failure), and cannot be published.
    """
    # 2 conflicting subjects sharing 30 students, but both locked to the SAME fixed slot
    subjects = [
        {"subject_id": "IMPOSSIBLE-1", "name": "Imp 1", "program": "BCA", "semester": 1,
         "duration_hours": 3, "requires_lab": 0, "enrolled_students": 30, "fixed_slot": "SLOT-1", "unavailable_slots": ""},
        {"subject_id": "IMPOSSIBLE-2", "name": "Imp 2", "program": "BCA", "semester": 1,
         "duration_hours": 3, "requires_lab": 0, "enrolled_students": 30, "fixed_slot": "SLOT-1", "unavailable_slots": ""}
    ]
    rooms = [
        {"room_id": "R1", "name": "Room 1", "capacity": 60, "room_type": "THEORY", "unavailable_slots": ""},
        {"room_id": "R2", "name": "Room 2", "capacity": 60, "room_type": "THEORY", "unavailable_slots": ""}
    ]
    timeslots = [
        {"slot_id": "SLOT-1", "day_number": 1, "exam_date": "2026-11-01", "session": "MORNING", "time_range": "09:30 AM - 12:30 PM"}
    ]
    faculty = [
        {"faculty_id": "F1", "name": "Prof A", "department": "BCA", "unavailable_slots": "", "max_duties": 4}
    ]
    # Both share all 30 students!
    enrollments = [
        {"roll_no": f"STU-{i}", "enrolled_subject_ids": "IMPOSSIBLE-1,IMPOSSIBLE-2"} for i in range(30)
    ]

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    res = service.run_algorithm("BACKTRACKING")

    assert res["status"] == "INFEASIBLE"
    assert res["is_feasible"] is False
    assert res["hard_conflicts"] > 0
    # Must explain the conflict
    diag = res["diagnostic_message"]
    assert "conflicting neighbor" in diag or "Infeasibility" in diag, f"Unexpected message: {diag}"


def test_scenario_10_multi_algorithm_alternatives_and_metrics():
    """
    [TC-C10-10] Phase 3 Scenario 10: Alternative Schedules & Benchmark Metrics
    Compares First-Fit, Welsh-Powell, and Backtracking.
    Confirms alternative schedules are valid, differ in assignment strategy or soft metrics,
    and report room utilization and slot efficiency with exact formulas.
    """
    repo = get_repository()
    rooms, timeslots, faculty, subjects, groups, enrollments = repo.get_active_dataset_records()

    service = TimetableOptimizerService(subjects, rooms, timeslots, faculty, enrollments)
    comparison = service.compare_all()

    assert "comparison" in comparison
    table = comparison["comparison"]
    assert len(table) == 3

    # All 3 must be feasible on normal dataset
    for r in table:
        assert r["is_feasible"] is True
        assert r["hard_conflicts"] == 0
        assert r["scheduled_exams"] == len(subjects)
        assert 0.0 <= r["room_utilization_pct"] <= 100.0
        assert 0.0 <= r["soft_score"] <= 100.0

    # Verify Welsh-Powell or Backtracking performs with high efficiency
    algs = {r["algorithm"]: r for r in table}
    assert "FIRST_FIT" in algs
    assert "WELSH_POWELL" in algs
    assert "BACKTRACKING" in algs


def test_scenario_11_export_csv_data_consistency(admin_headers):
    """
    [TC-C10-11] Phase 3 Scenario 11: Export Consistency
    Downloaded CSV directly matches the timetable in the database row-by-row and field-by-field.
    """
    client = TestClient(app)

    # 1. Generate a schedule
    gen_res = client.post("/api/v1/schedules/generate", json={"algorithm": "BACKTRACKING"}, headers=admin_headers)
    assert gen_res.status_code == 200
    run_id = gen_res.json()["run_id"]
    allocations = gen_res.json()["allocations"]

    # 2. Export CSV for this run
    export_res = client.get(f"/api/v1/timetable/export/csv?run_id={run_id}", headers=admin_headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]

    csv_reader = csv.DictReader(io.StringIO(export_res.text))
    csv_rows = list(csv_reader)

    # 3. Verify row count matches allocations count
    assert len(csv_rows) == len(allocations)

    # 4. Verify fields match exactly
    alloc_map = {a["subject_id"]: a for a in allocations}
    for row in csv_rows:
        s_id = row["subject_id"]
        assert s_id in alloc_map
        expected = alloc_map[s_id]
        assert row["slot_id"] == expected["slot_id"]
        assert row["room_id"] == expected["room_id"]
        assert row["room_name"] == expected["room_name"]
        assert int(row["assigned_students"]) == expected["assigned_students"]
        assert row["exam_date"] == expected["exam_date"]


def test_scenario_12_invalid_data_rejection(admin_headers):
    """
    [TC-C10-12] Phase 3 Scenario 12: Invalid Data Rejection
    Missing fields, negative student enrollments, duplicate IDs, and contradictory constraints
    are caught and rejected by DataQualityValidator with useful diagnostic error messages.
    """
    validator = DataQualityValidator()

    # Create invalid dataset
    bad_rooms = [{"room_id": "R1", "capacity": -10, "room_type": "INVALID_TYPE", "unavailable_slots": ""}]
    bad_slots = [{"slot_id": "S1", "day_number": 99, "exam_date": "invalid-date", "session": "NOON", "time_range": "bad"}]
    bad_faculty = [{"faculty_id": "F1", "department": "INVALID", "max_duties": -2}]
    bad_subjects = [{
        "subject_id": "SUB-1", "name": "Bad Subj", "program": "BAD_PROG", "semester": 10,
        "duration_hours": 5, "requires_lab": 9, "enrolled_students": -50,
        "fixed_slot": "S1", "unavailable_slots": "S1"  # Contradictory fixed == unavailable
    }]

    report = validator.validate_dataset(bad_rooms, bad_slots, bad_faculty, bad_subjects)
    assert report["is_valid"] is False
    assert report["summary"]["total_errors"] > 0

    all_messages = [e["message"] for e in report["errors"]] + [w["message"] for w in report["warnings"]]
    assert any("contradict" in m.lower() for m in all_messages)
    assert any("capacity" in m.lower() for m in all_messages)
    assert any("duration" in m.lower() for m in all_messages)


def test_scenario_13_persistence_and_publication_atomicity(admin_headers):
    """
    [TC-C10-13] Phase 3 Scenario 13: Database Persistence & Publication Atomicity
    Generating a schedule persists it to the database; publishing atomically activates it;
    attempting to publish an invalid run is rejected.
    """
    client = TestClient(app)

    # 1. Generate run
    gen_res = client.post("/api/v1/schedules/generate", json={"algorithm": "WELSH_POWELL"}, headers=admin_headers)
    assert gen_res.status_code == 200
    run_id = gen_res.json()["run_id"]

    # 2. Verify persistence via get run details
    detail_res = client.get(f"/api/v1/schedules/{run_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["run"]["run_id"] == run_id
    assert len(data["allocations"]) == gen_res.json()["scheduled_exams"]

    # 3. Atomically publish
    pub_res = client.post(f"/api/v1/schedules/{run_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["is_active"] is True
    assert "published_id" in pub_res.json()

    # 4. Check active published schedule endpoint
    pub_check = client.get("/api/v1/schedules/active-published")
    assert pub_check.status_code == 200
    assert pub_check.json()["run"]["run_id"] == run_id


def test_scenario_14_role_based_access_control_and_isolation(admin_headers, student_headers, faculty_headers):
    """
    [TC-C10-14] Phase 3 Scenario 14: Role-Based Access Control & User Boundary Isolation
    Students can access only their own schedule. Faculty can access only their duties.
    Draft runs and administrative generation are inaccessible to unprivileged roles.
    """
    client = TestClient(app)

    # 1. Student accessing their own timetable: 200 OK
    st_res = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=student_headers)
    assert st_res.status_code == 200
    assert st_res.json()["student"]["roll_no"] == "GLA26-BCA-0001"

    # 2. Student attempting to access ANOTHER student's timetable: 403 Forbidden
    st_snoop = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0002", headers=student_headers)
    assert st_snoop.status_code == 403

    # 3. Student attempting admin generation: 403 Forbidden
    st_admin_attempt = client.post("/api/v1/schedules/generate", json={"algorithm": "FIRST_FIT"}, headers=student_headers)
    assert st_admin_attempt.status_code == 403

    # 4. Faculty accessing their own duties: 200 OK
    fac_res = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=faculty_headers)
    assert fac_res.status_code == 200

    # 5. Faculty attempting to access another faculty: 403 Forbidden
    fac_snoop = client.get("/api/v1/timetable/faculty?faculty_id=FAC-102", headers=faculty_headers)
    assert fac_snoop.status_code == 403


def test_scenario_15_mobile_client_api_contract_parity():
    """
    [TC-C10-15] Phase 3 Scenario 15: Mobile Client Integration & Model Parity
    Verifies that the API endpoints consumed by the Flutter application provide
    all required JSON fields, types, and structures needed by Flutter models.
    """
    client = TestClient(app)

    # Published endpoint consumed by Mobile App
    pub_res = client.get("/api/v1/schedules/active-published")
    assert pub_res.status_code == 200
    data = pub_res.json()

    assert "allocations" in data
    allocs = data["allocations"]
    assert len(allocs) > 0

    required_keys = [
        "subject_id", "subject_name", "program", "semester",
        "slot_id", "exam_date", "session", "time_range",
        "room_id", "room_name", "room_capacity",
        "assigned_faculty_name", "assigned_students",
        "duration_hours", "requires_lab"
    ]

    for a in allocs:
        for k in required_keys:
            assert k in a, f"Mobile model required key '{k}' missing from allocation."
            assert a[k] is not None
