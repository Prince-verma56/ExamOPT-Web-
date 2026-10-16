import sys
import sqlite3
from pathlib import Path

db_path = Path("backend/examopt.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=" * 60)
print("EXAMOPT SYNTHETIC DATASET AUDIT REPORT")
print("=" * 60)

# 1. Subjects
subjects = cur.execute("SELECT * FROM subjects").fetchall()
print(f"\n1. SUBJECTS (Count: {len(subjects)})")
col_names = [d[0] for d in cur.description]
print(f"Columns: {col_names}")
programs = set(s[2] for s in subjects)
print(f"Programs: {programs}")
durations = set(s[4] for s in subjects)
print(f"Durations: {durations}")
labs = [s for s in subjects if s[5] == 1]
print(f"Lab subjects: {len(labs)} -> {[s[0] for s in labs]}")
fixed = [s for s in subjects if s[6]]
print(f"Fixed slot subjects: {len(fixed)} -> {[(s[0], s[6]) for s in fixed]}")
unavail = [s for s in subjects if s[7]]
print(f"Unavailable slot subjects: {len(unavail)} -> {[(s[0], s[7]) for s in unavail]}")

# 2. Rooms
rooms = cur.execute("SELECT * FROM rooms").fetchall()
print(f"\n2. ROOMS (Count: {len(rooms)})")
theory_rooms = [r for r in rooms if r[4] == 'THEORY']
lab_rooms = [r for r in rooms if r[4] == 'LAB']
print(f"Theory rooms: {len(theory_rooms)}, Total theory capacity: {sum(r[3] for r in theory_rooms)}")
print(f"Lab rooms: {len(lab_rooms)}, Total lab capacity: {sum(r[3] for r in lab_rooms)}")
room_unavail = [r for r in rooms if r[5]]
print(f"Rooms with unavailable slots: {len(room_unavail)} -> {[(r[0], r[5]) for r in room_unavail]}")

# 3. Timeslots
timeslots = cur.execute("SELECT * FROM timeslots ORDER BY day_number, session DESC").fetchall()
print(f"\n3. TIMESLOTS (Count: {len(timeslots)})")
for ts in timeslots:
    print(f"  {ts[0]}: Day {ts[1]}, Date {ts[2]}, {ts[3]} ({ts[4]})")

# 4. Faculty
faculty = cur.execute("SELECT * FROM faculty").fetchall()
print(f"\n4. FACULTY (Count: {len(faculty)})")
fac_depts = {}
for f in faculty:
    fac_depts[f[2]] = fac_depts.get(f[2], 0) + 1
print(f"Departments: {fac_depts}")
fac_unavail = [f for f in faculty if f[3]]
print(f"Faculty with unavailable slots: {len(fac_unavail)} -> {[(f[0], f[3]) for f in fac_unavail]}")
total_duty_cap = sum(f[4] for f in faculty)
print(f"Total max duty capacity: {total_duty_cap}")

# 5. Student Groups
groups = cur.execute("SELECT * FROM student_groups").fetchall()
print(f"\n5. STUDENT GROUPS (Count: {len(groups)})")
for g in groups:
    print(f"  {g[0]}: {g[1]} ({g[2]} Sem {g[3]}), Backlog: {bool(g[4])}, Count: {g[5]}")

# 6. Student Enrollments
students = cur.execute("SELECT * FROM student_enrollments").fetchall()
print(f"\n6. STUDENT ENROLLMENTS (Count: {len(students)})")
backlog_students = [s for s in students if s[4] == 1]
print(f"Regular students: {len(students) - len(backlog_students)}, Backlog students: {len(backlog_students)}")

# 7. Student-Subject Junction
sse = cur.execute("SELECT count(*) FROM student_subject_enrollments").fetchone()[0]
print(f"\n7. STUDENT-SUBJECT JUNCTION (Count: {sse})")

# 8. Check Student Clashes in Conflict Graph
sys.path.insert(0, 'backend')
from app.algorithms.conflict_graph import SubjectConflictGraph
from app.database import get_repository
repo = get_repository()
rooms_rec, timeslots_rec, faculty_rec, subjects_rec, groups_rec, enrollments_rec = repo.get_active_dataset_records()
graph = SubjectConflictGraph(subjects_rec, enrollments_rec)
print(f"\n8. CONFLICT GRAPH")
print(f"Total graph nodes: {len(graph.subjects)}")
total_edges = sum(len(neighbors) for neighbors in graph.adj.values()) // 2
print(f"Total graph edges (subject clashes due to shared students): {total_edges}")
clashing_pairs = []
for (u, v), w in graph.edge_weights.items():
    clashing_pairs.append((u, v, w))
print(f"Sample clashing subject pairs:")
for s1, s2, w in sorted(clashing_pairs, key=lambda x: -x[2])[:10]:
    print(f"  {s1} <-> {s2}: {w} shared students")


# Check Backlog Cross-Semester Clashes specifically
backlog_clashes = [p for p in clashing_pairs if ('BCA-102' in (p[0], p[1]) and 'BCADS-3' in p[0]+p[1]) or ('BCA-302' in (p[0], p[1]) and 'MCA-1' in p[0]+p[1])]
print(f"\nCross-semester backlog clashes created: {len(backlog_clashes)}")
for s1, s2, w in backlog_clashes:
    print(f"  Backlog conflict: {s1} <-> {s2}: {w} shared students")

conn.close()
