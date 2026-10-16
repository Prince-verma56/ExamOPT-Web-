import sqlite3

conn = sqlite3.connect('backend/examopt.db')
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' and name not like 'sqlite_%'").fetchall()]
print("Tables and counts:")
for t in tables:
    c = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {c}")

print("\nSubjects sample:")
for row in cur.execute("SELECT subject_id, name, program, semester, duration_hours, requires_lab, fixed_slot, unavailable_slots, enrolled_students FROM subjects LIMIT 5").fetchall():
    print(" ", row)

print("\nRooms sample:")
for row in cur.execute("SELECT room_id, name, capacity, room_type, unavailable_slots FROM rooms LIMIT 5").fetchall():
    print(" ", row)

print("\nTimeslots sample:")
for row in cur.execute("SELECT slot_id, day_number, exam_date, session, time_range FROM timeslots LIMIT 5").fetchall():
    print(" ", row)

print("\nFaculty sample:")
for row in cur.execute("SELECT faculty_id, name, department, unavailable_slots, max_duties FROM faculty LIMIT 5").fetchall():
    print(" ", row)

print("\nStudent sample:")
for row in cur.execute("SELECT roll_no, student_name, group_id, enrolled_subject_ids, has_backlog FROM student_enrollments LIMIT 5").fetchall():
    print(" ", row)

print("\nPublished schedules:")
for row in cur.execute("SELECT * FROM published_schedules").fetchall():
    print(" ", row)

conn.close()
