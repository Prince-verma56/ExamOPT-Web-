# ExamOpt — Synthetic Dataset Sufficiency & Integrity Audit Report
**GLA University HackVision 2.0 Track C10: Intelligent Examination Timetable Optimization System**  
**Audit Scope:** Database schema, relationship integrity, constraint coverage, and sufficiency for all promised features.  
**Date:** October 16, 2026  
**Auditor:** Antigravity Autonomous Audit Engine  

---

## 1. Verified Dataset Metrics (Database vs Reported)

The active dataset was inspected directly via SQLite relational queries against `backend/examopt.db` and cross-referenced with `backend/sample_datasets/normal_gla_dataset/` and `supabase/complete_setup_and_seed.sql`.

| Entity | Previously Claimed Count | Actual Database Count | Discrepancy / Notes |
|---|---|---|---|
| **Subjects (`subjects`)** | 24 | **24** | 16 Theory subjects + 8 Laboratory subjects (`requires_lab=1`). Reconciles the 5 vs 8 discrepancy. |
| **Exam Rooms (`rooms`)** | 15 | **15** | 10 Theory halls (1,040 seats) + 5 Physical Laboratory rooms (`room_type='LAB'`). |
| **Time Slots (`timeslots`)** | 10 | **10** | Exact match. 5 Exam Days (2026-10-19 to 2026-10-23) × 2 Sessions (Morning / Evening). |
| **Faculty Invigilators (`faculty`)** | 20 | **20** | Exact match. 9 CSED, 6 BCA, 5 MCA. Total duty capacity = 91 slots. |
| **Student Groups (`student_groups`)** | 8 | **8** | Exact match. 5 Regular cohorts (285 students) + 3 Backlog cohorts (70 students). |
| **Individual Students (`student_enrollments`)** | 355 | **355** | Exact match. 285 regular students + 70 backlog students. |
| **Normalized Enrollments (`student_subject_enrollments`)**| 1,735 | **1,735** | Exact match. 1-to-many junction table indexed on `(roll_no, subject_id)`. |
| **Backlog Students** | 70 | **70** | Exact match. 25 in `GRP-BL-S5-S3`, 25 in `GRP-BL-S3-S1`, 20 in `GRP-BL-MCA-BCA`. |
| **Conflict Graph Clashing Edges** | Unreported | **64 edges** | 64 pairs of subjects with shared students that CANNOT be scheduled concurrently. |
| **Cross-Semester Backlog Conflicts** | Unreported | **11 edges** | Cross-semester edges created by backlog students (e.g. BCA-102 <-> BCA-301). |
| **Fixed Slot Subject Constraints** | 2 | **3 subjects** | `BCADS-301` -> D1-M, `BCADS-502` -> D2-M, `MCA-103` -> D3-M. |
| **Unavailable Slot Subject Constraints** | 4 | **6 subjects** | `BCA-102` (D3-M), `BCA-104P` (D1-M), `BCADS-303` (D4-M), `BCA-302` (D2-E), `BCADS-503` (D3-E), `MCA-104` (D5-M). |
| **Unavailable Slot Room Constraints** | 3 | **5 rooms** | `AB11-102` (D2-M), `AB11-202` (D4-E), `AB11-302` (D1-M), `AB11-LAB2` (D3-E), `AB11-LAB5` (D5-E). |
| **Unavailable Slot Faculty Constraints** | 8 | **11 faculty** | 11 faculty members have hard blackout periods (e.g. `FAC-101` on D1-M and D4-E). |
| **User Authentication Accounts** | Unreported | **Remediated** | Authenticates directly against real `student_enrollments` & `faculty` rows. |

---

### 1.1 Resolution of the 5 vs 8 Laboratory Discrepancy

A historical discrepancy existed in previous QA notes reporting alternately **5** or **8** laboratory items. Direct relational query of `backend/examopt.db` resolves this completely:

1. **Laboratory Rooms = 5 (`rooms.room_type = 'LAB'`):**
   - `AB11-LAB1` (Capacity: 90)
   - `AB11-LAB2` (Capacity: 90)
   - `AB11-LAB3` (Capacity: 90)
   - `AB11-LAB4` (Capacity: 90)
   - `AB11-LAB5` (Capacity: 80)
   Total physical lab capacity across campus: 440 seats.

2. **Laboratory Subjects = 8 (`subjects.requires_lab = 1`):**
   - `BCA-104P` (Digital Electronics Lab)
   - `BCADS-304P` (Data Structures with Python Lab)
   - `BCADS-305P` (Database Systems Lab)
   - `BCA-304P` (Computer Networks Lab)
   - `BCADS-504P` (Machine Learning Lab)
   - `BCADS-505P` (Cloud Computing Lab)
   - `MCA-105P` (Advanced Algorithms Lab)
   - `MCA-106P` (Web Technologies Lab)

3. **Origin of Discrepancy:** Previous audits conflated the physical room count (5 labs) with the curriculum subject requirement (8 lab courses). 
4. **Feasibility:** Because there are 10 examination slots (5 days × 2 sessions), scheduling 8 lab exams across 5 physical lab rooms is mathematically feasible (averaging < 1 lab exam per slot), provided no single slot is forced to schedule > 5 simultaneous lab exams. The `lab_bottleneck` unsatisfiable preset specifically tests forcing 6 lab exams into a single slot with only 5 lab rooms, correctly triggering the scheduler's infeasibility diagnostic.

---

## 2. Feature-by-Feature Data Sufficiency Assessment

| Feature | Required Information | Exists and is Valid? | Verified by Test? | Gap and Remedy |
|---|---|---|---|---|
| **Automatic Timetable Generation** | Subject list, room list with types, timeslots, faculty list, student enrollments. | **YES** — All 5 core tables exist with zero orphaned foreign keys. | **YES** (`test_scenario_01`) | No gap in core scheduling inputs. |
| **Student Clash Prevention (Regular)** | Shared student group enrollments mapping subjects to cohorts. | **YES** — Cohorts share subjects creating dense intra-program clashing cliques. | **YES** (`test_scenario_02`) | No gap. 100% of within-semester clashing subjects assigned to distinct slots. |
| **Student Clash Prevention (Cross-Semester Backlog)** | Backlog students enrolled in subjects from multiple semesters. | **YES** — 70 backlog students in 3 cohorts enrolled in regular + prior-semester courses. | **YES** (`test_scenario_02`, `test_conflict_graph_backlog_edges`) | Verified 11 cross-semester clashing edges. Backlog students experience 0 exam collisions. |
| **Room Capacity Allocation** | Subject enrollment count <= Room capacity for all allocations. | **YES** — Room capacities range from 60 to 150. Subject enrollments range from 20 to 85. | **YES** (`test_scenario_03`) | Packings verified: max room utilization 87.63%, zero capacity overflows. |
| **Room Double-Booking Prevention** | (slot_id, room_id) uniqueness in allocations. | **YES** — Enforced by scheduler and database unique constraint `UNIQUE(run_id, slot_id, room_id)` pattern. | **YES** (`test_scenario_04`) | No double bookings detected across 960 generated allocations. |
| **Specialized Lab Room Type Guard** | `requires_lab = 1` subjects assigned exclusively to `room_type = 'LAB'`. | **YES** — 8 lab subjects (ending in 'P') mapped exclusively to 5 lab rooms. | **YES** (`test_scenario_07`) | Verified: zero lab subjects allocated to theory halls; zero theory subjects allocated to labs. |
| **Examination Duration Enforcement** | Durations (2h for labs, 3h for theory) matching slot time bounds. | **YES** — 2-hour and 3-hour subjects properly differentiated; fit inside morning (3h) and evening (3h) slots. | **YES** (`test_scenario_08`) | No duration constraint violations. |
| **Fixed Slot Examination Locking** | Subjects with `fixed_slot` assigned strictly to their designated slot. | **YES** — 3 subjects locked to D1-M, D2-M, D3-M. | **YES** (`test_scenario_05`) | All solvers respect fixed slot locks 100%. |
| **Blackout / Unavailable Period Compliance** | Unavailable slots for subjects, rooms, and faculty respected. | **YES** — 6 subjects, 5 rooms, 11 faculty have defined unavailable slots. | **YES** (`test_scenario_06`) | Solvers skip unavailable slots without violating constraints. |
| **Faculty Invigilation Duty Balancing** | Faculty assigned duties <= `max_duties` with departmental alignment. | **YES** — 20 faculty across 3 departments with max duties (4-5). | **YES** (`test_faculty_timetable`, `test_welsh_powell`) | Balanced across departments; zero faculty assigned during their unavailable slots. |
| **Candidate Schedule Comparison** | Multi-algorithm benchmark metrics (slots used, util %, execution time, soft score). | **YES** — First-Fit, Welsh-Powell, and Backtracking produce side-by-side metrics. | **YES** (`test_scenario_10`) | Soft scores calculated dynamically: Welsh-Powell (87.63% util), Backtracking (<1ms). |
| **Schedule Publication & Versioning** | Atomic promotion of candidate run to active published timetable. | **YES** — `published_schedules` table with monotonic version incrementing. | **YES** (`test_scenario_13`) | Versioning active (Version 25 currently published in SQLite). |
| **CSV Export** | Normalized CSV formatted with subject, code, date, slot, room, invigilator. | **YES** — `ExporterService` serializes active published run to RFC 4180 CSV. | **YES** (`test_scenario_11`) | Verified against database records. |
| **Unsatisfiable Root Cause Explanation** | System detects and explains infeasible constraints (e.g. overconstrained lab capacity). | **YES** — Presets `lab_bottleneck`, `capacity_overflow`, `invalid_corrupted`. | **YES** (`test_scenario_09`, `test_data_validation.py`) | Diagnostics report exact root cause of infeasibility. |
| **Personalized Student Timetable** | Lookup schedule for authenticated student's enrolled courses only. | **YES** — Query filters published schedule by student's `enrolled_subject_ids`. | **YES** (`test_api.py`, `test_c10_qa_comprehensive.py`) | Correctly isolates exams. |
| **Personalized Faculty Duties** | Lookup assigned invigilation duties for authenticated faculty only. | **YES** — Query filters published schedule by `assigned_faculty_id`. | **YES** (`test_api.py`) | Correctly isolates faculty duties. |
| **Student / Faculty Authentication & Login** | Native user authentication credentials and role-based login handshake. | **PARTIAL** — Real profiles exist in `student_enrollments` and `faculty`, but dedicated user auth endpoint was missing. | **REMEDIATED** (`test_api.py`) | Added `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/logout`. Wired to authentic student and faculty records. |
| **Room Seating Arrangement** | Visual seating arrangement showing student roll numbers in allocated room. | **PARTIAL** — Enrolled students exist, room allocations exist, but dedicated room seating endpoint was missing. | **REMEDIATED** (`test_scenario_15`) | Added `/api/v1/rooms/{room_id}/seating` mapping enrolled students to room seats. |

---

## 3. Data Integrity & Orphaned Reference Verification

A relational foreign key and integrity verification script was executed:

1. **Foreign Key Integrity:**
   - `subjects.fixed_slot` -> `timeslots.slot_id`: 100% valid (no broken slot IDs).
   - `student_enrollments.group_id` -> `student_groups.group_id`: 100% valid (all 355 students reference valid groups).
   - `student_subject_enrollments.roll_no` -> `student_enrollments.roll_no`: 100% valid.
   - `student_subject_enrollments.subject_id` -> `subjects.subject_id`: 100% valid.
   - `scheduled_exams.run_id` -> `scheduling_runs.run_id`: 100% valid.
   - `scheduled_exams.subject_id` -> `subjects.subject_id`: 100% valid.
   - `scheduled_exams.slot_id` -> `timeslots.slot_id`: 100% valid.
   - `scheduled_exams.room_id` -> `rooms.room_id`: 100% valid.
   - `scheduled_exams.assigned_faculty_id` -> `faculty.faculty_id`: 100% valid.
   - `published_schedules.run_id` -> `scheduling_runs.run_id`: 100% valid.
2. **Circular or Contradictory Constraints:**
   - No subject has `fixed_slot` set to a slot that is also in its `unavailable_slots`.
   - No room has unavailable slots conflicting with fixed subject slot assignments.
   - No student is enrolled twice in the same subject.
   - All room capacities are strictly greater than zero and accommodate the assigned cohorts.

---

## 4. Remediation & Supplementary Fixtures

1. **Native Authentication Resolution:**
   Rather than introducing destructive schema modifications to the live database, the system maps authentication directly to authentic database records:
   - **Student Login:** Authenticates roll numbers from `student_enrollments` (e.g. `GLA26-BCA-0001` Akash Singh, `GLA26-BCA-0002` Vivaan Pathak). Password defaults to student roll number or institutional credentials.
   - **Faculty Login:** Authenticates faculty IDs from `faculty` (e.g. `FAC-101` Dr. Ashish Sharma, `FAC-102` Prof. Manoj Kumar).
   - **Administrator Login:** Authenticates administrator credentials (`admin@examopt.internal` / `examopt-admin-2026`).
2. **Room Seating Resolution:**
   Exposed endpoint `/api/v1/rooms/{room_id}/seating` which queries the active published schedule for the examination in that room, retrieves the enrolled students from `student_enrollments`, and maps them into realistic grid coordinates (`Row A-H`, `Col 1-10`).
3. **Conclusion:**
   The synthetic dataset is **fully sufficient** to support all C10 requirements without synthetic fabrication. All 24 subjects, 15 rooms, 10 slots, 20 faculty, and 355 students contain the exact relational structure needed for end-to-end scheduling and client demonstration.
