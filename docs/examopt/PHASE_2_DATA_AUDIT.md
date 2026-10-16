# ExamOpt Phase 2: data audit

Audited on 2026-10-16 against the live Supabase project `tvyiqyngqehrxrcxqwei`.

**Method.** The audit was read-only. Columns, primary keys and foreign keys came from the PostgREST OpenAPI description, and row counts from `count=exact`. Direct Postgres connections time out from the development network: the IPv6-only direct host does not resolve, and pooler port 6543 times out. The application reads the database through PostgREST over HTTPS, so the audit did the same. CHECK and UNIQUE constraints are not exposed by PostgREST, so they were taken from `supabase/complete_setup_and_seed.sql`, which created these tables. That script was **not** run: it begins with `DROP TABLE … CASCADE`.

## Two table families

The database holds two parallel sets of tables. Similar names do **not** mean the tables are duplicates.

| Family | Tables | State | Role in Phase 2 |
|---|---|---|---|
| **C10 canonical** (from `complete_setup_and_seed.sql`) | `rooms`, `timeslots`, `subjects`, `student_groups`, `student_enrollments`, `student_subject_enrollments`, `faculty`, `scheduling_runs`, `scheduled_exams`, `schedule_conflicts`, `published_schedules`, `user_profiles` | Complete and internally consistent; foreign keys link runs → assignments → rooms/slots/subjects | **Scheduler input and run persistence** |
| Prisma-style normalized (from `prisma/schema.prisma` and migration `20261016000001`) | `exam_rooms`, `time_slots`, `students`, `enrollments`, `schedule_runs`, `subject_constraints`, `room_unavailabilities`, `subject_unavailabilities` | Partial: 9 students, 14 enrollments, 1 run. The two unavailability tables are empty | Not used by the scheduler |

`prisma/schema.prisma` maps `Subject` and `StudentGroup` onto `subjects` and `student_groups`, but with columns (`code`, `id`, `strength`, …) that do not exist on the live tables. Prisma also models tables such as `jobs` that are absent from Supabase. The working data layer is therefore `lib/supabase.ts` (`querySupabase`, PostgREST), which `server/examopt/repository.ts` already used in Phase 1. Phase 2 reads and writes through that same helper.

## Counts: intended fixture vs live

| Entity | Intended | Live | Notes |
|---|---:|---:|---|
| Rooms (`rooms`) | 15 | 15 | 10 THEORY (60–150 seats), 5 LAB (80–100); 1,480 seats |
| Time slots (`timeslots`) | 10 | 10 | 5 days × MORNING 09:30–12:30 / EVENING 14:00–17:00 (19–23 Oct 2026) |
| Subjects (`subjects`) | 24 | 24 | 16 theory (3 h), 8 practical (2 h, `requires_lab`) |
| Student groups | 8 | 8 | 5 regular, 3 backlog/bridge groups |
| Students (`student_enrollments`) | 355 | 355 | One row per student, with `group_id` and `has_backlog` |
| Student-subject enrollments | 1,735 | 1,735 | No duplicate (roll_no, subject_id) pairs |
| Faculty | 20 | 20 | Invigilation is out of Phase 2 scope |

**Consistency checks (all pass).**
- `subjects.enrolled_students` equals the actual enrollment count for all 24 subjects.
- The CSV column `student_enrollments.enrolled_subject_ids` and the normalized `student_subject_enrollments` hold identical pairs (1,735 = 1,735; none missing in either direction).
- Every enrollment references an existing student and subject.

No data adjustment was needed.

**Existing runs.** At audit time there were 10 `scheduling_runs`, 240 `scheduled_exams` (24 per run) and 3 `published_schedules`. These runs predate the Phase 2 engine, and their producer is not in this repository. More legacy-format runs and a published version 4 appeared while Phase 2 was being built, so another process is writing to these tables. Phase 2 labels all such runs *legacy / unverified* and re-validates them live when they are opened.

## Constraints that shape persistence

- `scheduling_runs.status` CHECK: `FEASIBLE | INFEASIBLE | PARTIAL | TIMEOUT`, and `algorithm` CHECK: `FIRST_FIT | WELSH_POWELL | BACKTRACKING`. Richer engine outcomes are therefore stored in `metadata_json.outcome` (`SEARCH_LIMIT` → `TIMEOUT`; `INVALID` → `PARTIAL`).
- `scheduled_exams` UNIQUE `(run_id, subject_id)`. **One room per examination.** The engine never splits an exam across rooms, and the validator flags a second assignment as `DUPLICATE_ASSIGNMENT`.
- `scheduled_exams.slot_id` and `room_id` are NOT NULL, so unscheduled exams have no row. They are listed in `metadata_json.unscheduledExamIds` and in `schedule_conflicts`.

## Mapping: database → scheduler input

Implemented in `server/scheduling/normalize.ts` (pure) and `server/scheduling/loader.ts` (paged PostgREST reads, 1,000 rows per page).

| Scheduler field | Source |
|---|---|
| `Exam.id` / `subjectId` | `subjects.subject_id`. One examination per subject. |
| `Exam.durationMinutes` | `subjects.duration_hours × 60` |
| `Exam.requiredRoomType` | `LAB` if `subjects.requires_lab`, else `THEORY`. Theory exams may not use laboratories. |
| `Exam.fixedSlotId` | `subjects.fixed_slot` (FK → `timeslots.slot_id`) |
| `Exam.unavailableSlotIds` | `subjects.unavailable_slots`, split on `|`, `,`, `;` or whitespace |
| `Exam.declaredStudents` | `subjects.enrolled_students`. Informational only; the scheduler uses actual enrollments. |
| `Room.*` | `rooms.room_id`, `capacity`, `room_type`, `unavailable_slots` (same splitting) |
| `Slot.*` | `timeslots.slot_id`, `exam_date`, `time_range` (`"09:30 AM - 12:30 PM"` → minutes), `session` |
| `Enrollment.studentId/examId` | `student_subject_enrollments.roll_no`, `subject_id` |
| `Enrollment.groupId` | `student_enrollments.group_id` |
| `Enrollment.isBacklog` | Derived: the subject's program differs from the student's group program, or the subject's semester is lower than the group's. Live: 120 of 1,735 enrollments. |

**Ignored by design.**
- `room_unavailabilities` and `subject_unavailabilities` are empty and keyed to the Prisma-family ids (`exam_rooms.id`, `time_slots.id`). The canonical unavailability source is the `unavailable_slots` columns.
- `subject_constraints` is empty.

## Live dataset as the engine sees it

- Fingerprint `879aa685`: an FNV-1a hash of the canonical input that changes whenever exams, rooms, slots or enrollments change.
- Preflight: 0 errors, 0 warnings.
- Conflict graph:
  - 24 vertices and 64 edges (density 23.2%; maximum degree 8; average 5.33).
  - 17 edges are cross-cohort and 19 carry backlog students.
  - Greedy clique {BCADS-301, -303, -501, -502, -503, -504P}: size 6.
  - The Welsh-Powell colouring also uses 6 colours, so **6 slots is the proven minimum** before room and fixed-slot constraints are applied.
- Fixed slots: BCADS-301 → D1-M, BCADS-502 → D2-M, MCA-103 → D3-M.
- Blackouts: 6 exam blackouts and 5 room blackouts (AB11-102 D2-M, AB11-202 D4-E, AB11-302 D1-M, AB11-LAB2 D3-E, AB11-LAB5 D5-E).
