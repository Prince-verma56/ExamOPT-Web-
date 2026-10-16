# Reference backend inventory and integration plan

Date: 2026-10-16 · Reference: `hackvision/` (read-only; nothing in it was modified, run, or copied as configuration)

This document lists every capability found in the reference backend, where it lives, its contract, and what ExamOpt does with it. The port results are in [REFERENCE_BACKEND_PORT_AUDIT.md](./REFERENCE_BACKEND_PORT_AUDIT.md).

## Files inspected

| Area | Files |
|---|---|
| API | `backend/main.py` (FastAPI, 15 routes) |
| Algorithms | `backend/app/algorithms/conflict_graph.py`, `baseline_first_fit.py`, `welsh_powell.py`, `backtracking.py`, `room_allocator.py`, `faculty_allocator.py` |
| Services | `backend/app/services/optimizer.py`, `exporter.py` |
| Validation | `backend/validator.py` |
| Auth | `backend/app/auth.py` |
| Data access | `backend/app/database/{base,config,factory,exceptions,sqlite_repository,supabase_repository}.py` |
| Schema | `backend/schema.sql`, `supabase/migrations/2026101600000{0,1,2}_*.sql`, `supabase/full_clean_setup.sql`, `supabase/complete_setup_and_seed.sql` (destructive: starts with `DROP TABLE … CASCADE`) |
| Data | `backend/seed_generator.py`, `backend/sample_datasets/normal_gla_dataset/*.csv`, `edge_case_capacity_overflow.csv`, `edge_case_lab_bottleneck.csv`, `invalid_corrupted_input.csv` |
| Tests | `backend/tests/test_algorithms.py` (4), `test_data_validation.py` (4), `test_api.py` (6), `test_database_adapters.py`, `test_supabase_security.py`, `autonomous_browser_audit.py`, `conftest.py` |
| Docs | `EXAMOPT-PHASE-1-HANDOFF.md`, `README.md`, `docs/*.md` (claims were checked against the code, not relied on) |

`hackvision/frontend/` was not used as a source for any UI.

## Data model

The live Supabase "canonical" tables were created from the reference schema (`backend/schema.sql` / `complete_setup_and_seed.sql`), so the mapping is one to one. **No schema change is needed.** The Prisma-family tables (`exam_rooms`, `time_slots`, `students`, `enrollments`, `schedule_runs`, …) are not part of the reference and are not used by the scheduler (see [PHASE_2_DATA_AUDIT.md](./PHASE_2_DATA_AUDIT.md)).

| Reference table | ExamOpt table | Used by |
|---|---|---|
| `rooms` | `rooms` (same) | loader, data quality, room editor |
| `timeslots` | `timeslots` (same) | loader, data quality, slot editor (fixed in this phase: it wrote to `time_slots`) |
| `faculty` | `faculty` (same) | **new:** invigilation, faculty roster, faculty timetable |
| `subjects` | `subjects` (same) | loader, data quality |
| `student_groups` | `student_groups` (same) | loader (backlog derivation) |
| `student_enrollments` | `student_enrollments` (same) | loader; **new:** student directory and student timetable |
| `student_subject_enrollments` | same | conflict graph source of truth |
| `scheduling_runs` | same | run persistence (detailed outcome in `metadata_json`) |
| `scheduled_exams` | same | assignments; **new:** `assigned_faculty_id` is now written |
| `published_schedules` | same | **new:** publication workflow |
| `schedule_conflicts` | same | run diagnostics |
| `user_profiles` (Supabase-auth UUID keyed) | not used | Identity comes from Clerk. Student and faculty linkage uses Clerk `publicMetadata` instead (see Auth). |

## Feature inventory

Legend for **Decision**: **Port** (new in ExamOpt), **Adapt** (an equivalent already exists; differences are documented and reconciled), **Replace** (an existing ExamOpt system covers it), **Exclude** (deliberately not brought over).

| # | Feature | Reference | Purpose | Input → output | Entities | Existing tests | ExamOpt destination | Decision |
|---|---|---|---|---|---|---|---|---|
| 1 | Conflict graph | `conflict_graph.py` `SubjectConflictGraph` | Edge between exams sharing a student; weights = shared students; degree, weighted degree | subjects, enrollments (CSV `enrolled_subject_ids`) → adjacency, weights, shared roll numbers | subjects, student_enrollments | `test_conflict_graph_backlog_edges` (BCA-101↔MCA-101 = 20, BCADS-301↔BCADS-501 = 25) | `server/scheduling/conflict-graph.ts` | **Adapt.** Built from the normalized junction table. Shared roll numbers are not exposed (privacy); counts are. Reference weights reproduced in tests. |
| 2 | First-Fit baseline | `baseline_first_fit.py` | Earliest slot without a student clash, then a room | subjects in input order → allocations, unscheduled + reasons | subjects, rooms, timeslots | none direct | `algorithms.ts` `firstFit` | **Adapt.** ExamOpt orders by exam id and takes the first suitable free room (the reference uses best fit even in the baseline). Kept as the honest baseline; difference documented. |
| 3 | Welsh-Powell | `welsh_powell.py` | Fixed exams first, then degree order (degree, weighted degree, id desc), first feasible slot | → allocations | same | `test_welsh_powell_produces_no_student_clashes` | `algorithms.ts` `welshPowell` | **Adapt.** ExamOpt sweeps colour classes slot by slot (classic Welsh-Powell) with best-fit rooms; tie-break is degree, then students, then id. Same clash-freedom guarantee; reference test reproduced. |
| 4 | Constraint backtracking | `backtracking.py` | MRV + degree tie-break, forward checking, node limit 5,000 / 5 s | → FEASIBLE / INFEASIBLE / TIMEOUT | same | `test_backtracking_solver_correctness` | `algorithms.ts` `backtracking` | **Adapt.** ExamOpt searches (slot, room) pairs, so exhausting the search is a real proof. The reference picks rooms greedily yet reports "Proven Infeasibility" when its slot-only search fails, which is unsound; ExamOpt does not repeat that claim. |
| 5 | Best-Fit room allocation | `room_allocator.py` | Type match (LAB/THEORY), free, available, smallest adequate room; tie by id; diagnostic reason | subject, slot, occupied rooms → room or reason | rooms | covered in algorithm tests | `model.ts` `Occupancy.bestFitRoom` | **Adapt.** Same rule (capacity checked against actual enrollment). |
| 6 | Invigilator allocation | `faculty_allocator.py` | One invigilator per exam: not busy in the slot, not unavailable, under `max_duties`; prefer program department (MCA→MCA, BCA→BCA, else CSED), then fewest duties, then id | subject, slot, busy faculty, duty counts → faculty or `TBD` | faculty, scheduled_exams.assigned_faculty_id | none | **new** `server/scheduling/invigilation.ts` | **Port.** Same rule, applied after the exam schedule is final, processed chronologically. Plus an independent invigilation validator (double duty, unavailability, duty cap, unknown faculty). |
| 7 | Optimizer service and benchmark | `optimizer.py` `run_algorithm`, `compare_all`, `_compute_soft_score` | Run one or all algorithms on one dataset; 0–100 soft score; winner = best score among feasible | algorithm name → result; none → comparison table + best | — | `test_algorithm_benchmark_comparison` | `engine.ts`, `service.ts` | **Adapt + Port.** Runs and saved-run comparison exist. Ported: in-memory benchmark (`POST /api/v1/scheduling/compare`, nothing persisted) and the reference 0–100 score as `referenceScore` (reported next to ExamOpt's penalty; never used to rank an infeasible run above a feasible one). |
| 8 | CSV export | `exporter.py` | Timetable CSV and room-allocation CSV | allocations → CSV text | scheduled_exams | none | **new** `server/scheduling/export.ts` | **Port.** Plus an invigilation CSV. |
| 9 | Dataset quality validator | `validator.py` `DataQualityValidator` | Row-level checks across all tables; readiness score 100 − 20·errors − 5·warnings | raw tables → report {is_valid, readiness_score, errors, warnings, diagnostics} | all input tables | `test_sqlite_normal_dataset_readiness`, `test_corrupted_input_rejection`, `test_lab_bottleneck_detection`, `test_capacity_overflow_detection` | **new** `server/scheduling/data-quality.ts` | **Port.** Same codes and score. Complements preflight (which works on the normalized model and blocks the solver). |
| 10 | CSV file validation | `validator.py` `validate_csv_file` | Validate one uploaded table in the context of the rest of the dataset | CSV + table type → report | — | via #9 tests | `service.dataQuality(csv)`; Import page | **Port** as a dry run: nothing is written to the database. |
| 11 | Edge-case presets | `main.py` `load-preset`, `validate` with `preset_name` | Swap the active dataset (SQLite only; disabled for Supabase) | preset → validation report | — | `test_admin_full_operations` | Test Lab "Reference" cases | **Replace.** Presets run in memory in the Test Lab; the live database is never switched or reseeded. |
| 12 | Synthetic data generator | `seed_generator.py` | Build the GLA dataset and seed SQLite | — | all | — | **new** `server/scheduling/reference-dataset.ts` | **Port (definition only).** The deterministic dataset definition (rooms, slots, subjects, groups and their subject lists, faculty) is rebuilt in memory for tests. The seeding step is **excluded**: it would reset the database. |
| 13 | Run persistence | `save_scheduling_run` | Insert run, allocations, conflicts | run record → stored | scheduling_runs, scheduled_exams, schedule_conflicts | `test_database_adapters.py` | `persistence.ts` | **Adapt** (exists). Now also writes `assigned_faculty_id`. |
| 14 | Run listing and detail | `list_scheduling_runs`, `get_schedule_run_details` | History; one run with allocations | run_id → details | same | `test_api.py` | `persistence.ts`, `service.runDetail` | **Replace** (exists, with live re-validation). |
| 15 | Publish | `publish_schedule` | Reject status ≠ FEASIBLE or hard conflicts > 0; deactivate older versions; insert version + 1 | run_id → publication | published_schedules | `test_admin_full_operations` | **new** `persistence.publish`, `service.publish`, `POST …/runs/[runId]/publish` | **Port, stricter.** Engine runs only; stored outcome FEASIBLE; live re-validation must pass all 10 rules; invigilation must have no violations; older versions are kept as history. |
| 16 | Active published schedule | `get_active_published_schedule` (public) | Current authoritative timetable | — → allocations + publication | published_schedules + run | `test_public_active_published_timetable_access` | **new** `GET /api/v1/scheduling/published` | **Port.** Requires sign-in (no anonymous access); contains no student data. |
| 17 | Student timetable | `get_student_timetable` + `resolve_student_authorization` | A student's exams from the active published run | roll_no → student + exams | student_enrollments, published run | `test_student_isolation_and_boundary_checks` | **new** `GET /api/v1/timetable/student`, `/student` page | **Port.** Identity comes from Clerk server-side metadata, never from the request. |
| 18 | Faculty duties | `get_faculty_timetable` + `resolve_faculty_authorization` | Invigilation duties from the active published run | faculty_id → duties | faculty, published run | `test_faculty_isolation_and_boundary_checks` | **new** `GET /api/v1/timetable/faculty` | **Port.** Same identity rule. |
| 19 | Export endpoint | `GET /api/v1/timetable/export/csv` | Published (any signed-in user) or draft (admin) CSV | run_id? → CSV | — | none | **new** `GET /api/v1/scheduling/export` | **Port.** CSV text returned in the standard JSON envelope. |
| 20 | Health | `GET /health` | Separate app and database status | — | — | `test_health_check_public_and_distinct_process_db` | `app/api/v1/health` | **Replace** (exists). |
| 21 | Data summary / tables | `/api/data/summary`, `/api/data/tables/{t}` | Counts; paginated rows | — | all | `test_admin_full_operations` | readiness, metrics, resource routes | **Replace** (exists). Fabricated fallback counts in `repository.counts()` removed. |
| 22 | RBAC | `auth.py` | ADMIN / FACULTY / STUDENT; HS256 JWT; dev mode trusts `X-ExamOpt-Role` headers | token + headers → user | — | `test_api.py` | Clerk + `modules/auth/access.ts` | **Replace.** Header-asserted roles are **excluded** (the client could claim to be anyone). Scoping rules ported as pure, tested functions. |
| 23 | Database adapters | `app/database/*` | SQLite or Supabase repository | — | — | `test_database_adapters.py` | `lib/supabase.ts` + loaders | **Replace.** One data path (PostgREST). SQLite excluded. |
| 24 | Supabase SQL and RLS | `supabase/*.sql` | Schema, RLS, seed | — | — | `test_supabase_security.py` | — | **Exclude** from execution. Tables already exist; `complete_setup_and_seed.sql` is destructive and was never run. |
| 25 | SPA serving, CORS | `main.py` | Serve the Vite build; CORS | — | — | — | — | **Not applicable** (same-origin Next.js). |

## Reference test cases and their ExamOpt equivalents

| Reference test | Behaviour | ExamOpt equivalent |
|---|---|---|
| `test_conflict_graph_backlog_edges` | BCA-101↔MCA-101 share 20; BCADS-301↔BCADS-501 share 25 | `tests/unit/scheduling/reference.test.ts` + Test Lab `reference-gla-normal` |
| `test_welsh_powell_produces_no_student_clashes` | Feasible, 0 conflicts, all 24 scheduled, no edge inside one slot | same |
| `test_backtracking_solver_correctness` | Feasible, nodes > 0, capacity respected, labs in LAB rooms | same |
| `test_algorithm_benchmark_comparison` | All three algorithms compared | same + `benchmark()` |
| `test_sqlite_normal_dataset_readiness` | Score 100, 0 errors | same (data quality on the reference dataset) |
| `test_corrupted_input_rejection` | DUPLICATE_SUBJECT_ID, NEGATIVE_ENROLLMENT, CONTRADICTORY_CONSTRAINTS, FOREIGN_KEY_NOT_FOUND | same + Test Lab `reference-corrupted` |
| `test_lab_bottleneck_detection` | LAB_BOTTLENECK | same + Test Lab `reference-lab-bottleneck` |
| `test_capacity_overflow_detection` | CAPACITY_OVERFLOW | same + Test Lab `reference-capacity-overflow` |
| `test_api.py` (401 / 403 / scoping / publish) | Unauthenticated rejected; students and faculty isolated; admin can publish | `tests/unit/timetable-access.test.ts`, `tests/unit/scheduling/publish.test.ts` |
| `test_database_adapters.py`, `test_supabase_security.py` | SQLite/Supabase adapters, RLS | Not ported (no adapters, no RLS execution); live persistence covered by `tests/integration/scheduling.test.ts` |
| `autonomous_browser_audit.py` | Drives the Vite UI | Not applicable |

## Capabilities ExamOpt already had (not duplicated)

Normalisation with backlog derivation, preflight necessary-condition proofs, the 10-rule independent validator, the soft-metric suite, commit-marker persistence, live re-validation of saved runs, the conflict-graph page, and the 14 Phase 2 Test Lab cases.

## Integration plan

1. Pure modules (no I/O): `invigilation.ts`, `data-quality.ts`, `export.ts`, `reference-dataset.ts`; the reference score in `metrics.ts`; invigilation wired into `engine.ts` (engine 2.1.0).
2. Data layer: load `faculty`; write `assigned_faculty_id`; publication read/write; student and faculty lookups. All through `lib/supabase.ts`.
3. Service and API v1 routes with Zod, `createApiRoute`, admin checks, and identity scoping from Clerk metadata.
4. Test Lab: reference cases on the in-memory GLA dataset and the three edge-case files.
5. UI: publish and export on the Timetable page; data quality, invigilation and reference score in the Optimization Lab; real data on the Students, Faculty, Data hub, Constraints, Import & Export and Student pages. The landing-page hero is not touched.
6. Tests: unit equivalence tests, access tests, live integration tests.
