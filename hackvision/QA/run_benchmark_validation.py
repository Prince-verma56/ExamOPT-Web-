import sys
sys.path.insert(0, 'backend')
import json
from app.database.config import DatabaseConfig
from app.database.sqlite_repository import SQLiteRepository
from app.services.optimizer import TimetableOptimizerService

sq_cfg = DatabaseConfig(backend='sqlite')
sq_repo = SQLiteRepository(sq_cfg.sqlite_db_path)
rooms, timeslots, faculty, subjects, groups, enrollments = sq_repo.get_active_dataset_records()

optimizer = TimetableOptimizerService(
    subjects=subjects,
    rooms=rooms,
    timeslots=timeslots,
    faculty=faculty,
    enrollments=enrollments
)

results = optimizer.compare_all()

print("=== BENCHMARK COMPARISON RESULTS ===")
for m in results['comparison']:
    print(f"Algorithm: {m['algorithm']}")
    print(f"  Status: {m['status']}, Feasible: {m['is_feasible']}")
    print(f"  Scheduled: {m['scheduled_exams']}/{results['summary']['total_exams_to_schedule']}")
    print(f"  Unscheduled: {m['unscheduled_exams']}, Hard Conflicts: {m['hard_conflicts']}")
    print(f"  Slots Used: {m['slots_used']}/{results['summary']['total_available_slots']}")
    print(f"  Room Utilization: {m['room_utilization_pct']}%")
    print(f"  Unused Capacity Seats: {m['unused_capacity_seats']}")
    print(f"  Execution Time: {m['execution_time_ms']} ms")
    print(f"  Soft Score: {m['soft_score']}/100")

# Run independent validation on all 3
print("\n=== INDEPENDENT VALIDATION ON ALL 3 ALGORITHMS ===")
# Build student -> subjects and subject -> students map
student_courses = {}
subj_students = {}
for row in enrollments:
    roll_no = row["roll_no"]
    raw = row.get("enrolled_subject_ids", "")
    if isinstance(raw, str):
        s_list = [s.strip() for s in raw.split(",") if s.strip()]
    elif isinstance(raw, list):
        s_list = raw
    else:
        s_list = []
    student_courses[roll_no] = s_list
    for s_id in s_list:
        subj_students.setdefault(s_id, set()).add(roll_no)

for alg in ['FIRST_FIT', 'WELSH_POWELL', 'BACKTRACKING']:
    allocs = results['detailed_results'][alg]['allocations']
    print(f"\nChecking {alg} ({len(allocs)} allocations)...")
    
    slot_allocs = {}
    for a in allocs:
        slot_allocs.setdefault(a['slot_id'], []).append(a)
        
    # 1. Student clash check
    student_clashes = 0
    clash_details = []
    for slot_id, s_allocs in slot_allocs.items():
        seen_students = set()
        for a in s_allocs:
            stus = subj_students.get(a['subject_id'], set())
            overlap = seen_students.intersection(stus)
            if overlap:
                student_clashes += len(overlap)
                clash_details.append(f"Slot {slot_id}: {a['subject_id']} shares students with another exam")
            seen_students.update(stus)
            
    # 2. Room double-booking check
    room_clashes = 0
    for slot_id, s_allocs in slot_allocs.items():
        seen_rooms = set()
        for a in s_allocs:
            if a['room_id'] in seen_rooms:
                room_clashes += 1
            seen_rooms.add(a['room_id'])
            
    # 3. Lab requirement check
    lab_errors = 0
    room_map = {r['room_id']: r for r in rooms}
    for a in allocs:
        if a.get('requires_lab') and room_map.get(a['room_id'], {}).get('room_type') != 'LAB':
            lab_errors += 1
            
    # 4. Room capacity check
    capacity_errors = 0
    for a in allocs:
        r_cap = room_map.get(a['room_id'], {}).get('capacity', 0)
        if a['assigned_students'] > r_cap:
            capacity_errors += 1
            
    # 5. Faculty limits check
    faculty_duties = {}
    faculty_slot = {}
    faculty_clashes = 0
    faculty_limit_errors = 0
    fac_map = {f['faculty_id']: f for f in faculty}
    for a in allocs:
        fac_id = a.get('assigned_faculty_id')
        if fac_id and fac_id != 'TBD':
            faculty_duties[fac_id] = faculty_duties.get(fac_id, 0) + 1
            slot_set = faculty_slot.setdefault(fac_id, set())
            if a['slot_id'] in slot_set:
                faculty_clashes += 1
            slot_set.add(a['slot_id'])
            
    for f_id, count in faculty_duties.items():
        max_d = fac_map.get(f_id, {}).get('max_duties', 4)
        if count > max_d:
            faculty_limit_errors += 1
            
    print(f"  Scheduled exams: {len(allocs)}/24")
    print(f"  Student Clashes: {student_clashes}")
    print(f"  Room Double Bookings: {room_clashes}")
    print(f"  Lab Requirement Violations: {lab_errors}")
    print(f"  Room Capacity Overflows: {capacity_errors}")
    print(f"  Faculty Slot Clashes: {faculty_clashes}")
    print(f"  Faculty Limit Violations: {faculty_limit_errors}")
    hard_total = student_clashes + room_clashes + lab_errors + capacity_errors + faculty_clashes + faculty_limit_errors
    print(f"  TOTAL HARD CONSTRAINT VIOLATIONS: {hard_total}")
    assert hard_total == 0, f"Expected 0 hard constraint violations for {alg}, got {hard_total}"
print("\nALL 3 ALGORITHMS VERIFIED: 100% FEASIBLE WITH 0 HARD CONSTRAINT VIOLATIONS!")
