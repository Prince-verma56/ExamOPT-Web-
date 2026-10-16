import sqlite3

conn = sqlite3.connect('backend/examopt.db')
c = conn.cursor()

tables = ['rooms', 'timeslots', 'faculty', 'subjects', 'student_groups', 'student_enrollments', 'student_subject_enrollments', 'scheduling_runs', 'scheduled_exams', 'published_schedules']

print("--- RECORD COUNTS ---")
for t in tables:
    count = c.execute(f"SELECT COUNT(*) FROM {t};").fetchone()[0]
    print(f"Table {t:28}: {count} records")

print("\n--- SAMPLE STUDENT ENROLLMENTS ---")
for row in c.execute("SELECT roll_no, student_name, program, semester, enrolled_subject_ids FROM student_enrollments LIMIT 5;").fetchall():
    print(row)

print("\n--- SAMPLE FACULTY ---")
for row in c.execute("SELECT faculty_id, name, department, designation, email FROM faculty LIMIT 5;").fetchall():
    print(row)

print("\n--- SAMPLE ROOMS ---")
for row in c.execute("SELECT room_id, name, capacity, room_type, building FROM rooms LIMIT 5;").fetchall():
    print(row)

print("\n--- SAMPLE SUBJECTS ---")
for row in c.execute("SELECT subject_id, name, program, semester FROM subjects LIMIT 5;").fetchall():
    print(row)

print("\n--- SAMPLE SCHEDULED EXAMS ---")
for row in c.execute("SELECT run_id, subject_id, room_id, timeslot_id, faculty_id, allocated_students FROM scheduled_exams LIMIT 5;").fetchall():
    print(row)
