import sys
sys.path.insert(0, 'backend')
from app.database import get_repository

repo = get_repository()
active = repo.get_active_published_schedule()
print("Active schedule run_id:", active["run"]["run_id"] if active else None)
print("Publication title:", active.get("publication", {}).get("title") if active else None)
if active:
    print(f"Total allocations: {len(active['allocations'])}")
    for a in active['allocations'][:5]:
        print(" ", a['subject_id'], a['subject_name'], a['slot_id'], a['exam_date'], a['time_range'], a['room_id'], a['assigned_faculty_name'])

st = repo.get_student_timetable('GLA26-BCA-0001')
print("\nStudent GLA26-BCA-0001 timetable:")
print("Student:", st['student']['student_name'], st['student']['roll_no'], st['student']['group_id'])
print("Total enrolled:", st['total_enrolled_exams'], "Scheduled:", st['scheduled_exams_count'])
for ex in st['schedule']:
    print(" ", ex['subject_id'], ex['subject_name'], ex['exam_date'], ex['slot_id'], ex['time_range'], ex['room_name'], ex['assigned_faculty_name'])

fac = repo.get_faculty_timetable('FAC-101')
print("\nFaculty FAC-101 duties:")
print("Faculty:", fac['faculty']['name'], fac['faculty']['department'], "Duties:", fac['assigned_duties_count'])
for d in fac['duties']:
    print(" ", d['subject_id'], d['subject_name'], d['exam_date'], d['slot_id'], d['time_range'], d['room_name'])
