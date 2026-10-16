# Reference backend port audit

Date: 2026-10-16 · Engine 2.1.0 · Reference: `hackvision/` (read-only)

This audit covers the port of the reference backend into ExamOpt. The feature-by-feature inventory and integration plan are in [REFERENCE_BACKEND_INVENTORY.md](./REFERENCE_BACKEND_INVENTORY.md). Phase 2 results are in [PHASE_2_AUDIT.md](./PHASE_2_AUDIT.md).

**Status key:** IMPLEMENTED AND VERIFIED · IMPLEMENTED, NOT VERIFIED · PARTIAL · BLOCKED · NOT APPLICABLE

## Summary

- **The live database is the reference dataset.** Its dataset fingerprint is identical to that of the reference GLA dataset rebuilt in memory from `sample_datasets/` and `seed_generator.py` (integration test). So the reference test cases, run in memory, test the same data the application schedules.
- **Ported in this phase:**
  - invigilator allocation, plus an independent invigilation validator;
  - the row-level dataset quality validator, including CSV dry runs;
  - the reference 0–100 quality score;
  - an in-memory benchmark;
  - CSV exports;
  - publication with a stricter gate;
  - published, student and faculty timetables with identity scoping;
  - 6 new Test Lab cases (20 in total) covering every reference test.
- **Already in ExamOpt (Phase 2), compared and reconciled rather than duplicated:** conflict graph, the three algorithms, best-fit rooms, persistence, run history and comparison.
- **Data workspace corrections:**
  - Six pages showed hard-coded or generated data. They now read the canonical tables: data hub, students, faculty, constraints, analytics and import/export. The student portal is also fixed: it generated a fake schedule for any roll number.
  - The time-slot editor wrote to a table the scheduler never reads.
- **No schema change and no migration.** Nothing was dropped, truncated, reseeded or overwritten. `hackvision/` was not modified.

## Reference analysis

- **Files inspected:** the backend Python sources, schema, migrations, sample datasets, tests and docs. The full list is in the inventory.
- **Algorithms:**
  - First-Fit (`baseline_first_fit.py`);
  - Welsh-Powell (`welsh_powell.py`);
  - MRV / forward-checking backtracking (`backtracking.py`);
  - best-fit room allocation (`room_allocator.py`);
  - invigilator allocation (`faculty_allocator.py`).
- **Backend features:**
  - optimizer and benchmark with a 0–100 score;
  - CSV exporter;
  - dataset quality validator and CSV validation;
  - edge-case presets;
  - synthetic data generator;
  - run persistence and history;
  - publication and active published timetable;
  - student and faculty timetables;
  - CSV export endpoint;
  - health check;
  - header/JWT RBAC;
  - SQLite/Supabase repositories.
- **Tests found:**
  - `test_algorithms.py` (4);
  - `test_data_validation.py` (4);
  - `test_api.py` (6);
  - `test_database_adapters.py`, `test_supabase_security.py`, `autonomous_browser_audit.py`.
- **Data models:** 11 tables in `schema.sql`, identical to the live canonical tables, plus `user_profiles` (keyed to Supabase-auth UUIDs, so not usable with Clerk).

## Porting map

| Reference | ExamOpt | Adaptations | Tests | Result |
|---|---|---|---|---|
| `conflict_graph.py` | `server/scheduling/conflict-graph.ts` (Phase 2) | Built from `student_subject_enrollments`. Shared roll numbers are not exposed, only counts. | `reference.test.ts`, Test Lab `reference-gla-normal` | BCA-101↔MCA-101 = 20 and BCADS-301↔BCADS-501 = 25, as in the reference |
| `baseline_first_fit.py` | `algorithms.ts` `firstFit` | Id order and first-fit room (the reference used input order and best fit). It stays an honest baseline. | `reference.test.ts` | PARTIAL on the GLA data, never reported as infeasible |
| `welsh_powell.py` | `algorithms.ts` `welshPowell` | Colour classes swept slot by slot; ties broken by student count, not weighted degree | `reference.test.ts`, Test Lab | FEASIBLE, 24/24, no conflict edge inside a slot |
| `backtracking.py` | `algorithms.ts` `backtracking` | Domain is (slot, room) pairs, so an exhausted search is a sound proof. The reference chose rooms greedily, so its "Proven Infeasibility" claim was unsound. | `reference.test.ts`, Test Lab | FEASIBLE, nodes > 0, capacity and laboratories respected |
| `room_allocator.py` | `model.ts` `bestFitRoom` | Capacity is checked against actual enrollments | as above | Verified |
| `faculty_allocator.py` | **new** `invigilation.ts` | Same eligibility and preference order. Exams are processed chronologically, so the result is independent of solver order. Overlapping slots count as busy. An independent validator was added. | `reference.test.ts`, Test Lab `invigilation-rules`, integration | 24/24 covered on the GLA data, 0 rule violations; persisted to `assigned_faculty_id` |
| `optimizer.py` `_compute_soft_score` | `metrics.ts` `referenceQualityScore` → `metrics.referenceScore` | Reported only; ranking stays feasibility-first | `reference.test.ts` | Formula verified |
| `optimizer.py` `compare_all` | `service.benchmark`, `POST /api/v1/scheduling/compare` | Nothing persisted. Returns both the ExamOpt ranking and the reference "best" pick. | build, typecheck | IMPLEMENTED, NOT VERIFIED over HTTP (service path covered by the Test Lab) |
| `exporter.py` | **new** `export.ts`, `GET /api/v1/scheduling/export` | Same columns and sort order. Adds an invigilation sheet. CSV is returned in the JSON envelope. | `reference.test.ts`, integration, HTTP | Verified |
| `validator.py` `DataQualityValidator` | **new** `data-quality.ts` | Same codes and score. Fixes: numeric count comparison; labs counted per slot; non-positive duration is an error; the normalised enrollment table is cross-checked. | `reference.test.ts` (6), Test Lab (4 reference cases) | Live data: valid, score 100 (integration and HTTP) |
| `validate_csv_file` | `validateTableInContext`, `POST /api/v1/scheduling/data-quality` | Dry run. A partial subjects file skips the enrollment cross-check (the reference used a "< 20 rows" rule). | `reference.test.ts` | Verified (unit); UI not exercised |
| `load-preset` | Test Lab "Reference" cases, Import page samples | Never mutates the live database | Test Lab | Verified |
| `seed_generator.py` | `reference-dataset.ts`, `reference-samples.ts` | Definition only; names omitted; seeding excluded | `reference.test.ts` | Fingerprint equals live |
| `publish_schedule` | **new** `persistence.publish`, `service.publish`, `publication.ts`, `POST …/runs/[runId]/publish` | Stricter gate (see below). Insert first, then retire older versions; history kept. | `timetable-access.test.ts`, Test Lab `publication-gate`, integration (gate), HTTP (refusal) | Gate verified; **live publish write not executed** (see Remaining work) |
| `get_active_published_schedule` | **new** `service.publishedSchedule`, `GET /api/v1/scheduling/published` | Requires sign-in; includes live validation status | integration, HTTP | Verified |
| `get_student_timetable` + `resolve_student_authorization` | **new** `GET /api/v1/timetable/student`, `/student` page | Identity from Clerk `publicMetadata.rollNo`, read server-side | `timetable-access.test.ts`, integration, HTTP | Verified (API); student sign-in not exercised |
| `get_faculty_timetable` + `resolve_faculty_authorization` | **new** `GET /api/v1/timetable/faculty` | Identity from `publicMetadata.facultyId` | same | Verified (API) |
| `auth.py` | `modules/auth/access.ts`, `server/api/index.ts` | Header-asserted roles (`X-ExamOpt-Role`) excluded | `access.test.ts`, `timetable-access.test.ts` | Verified |
| `test_api.py` (401/403/scoping) | `timetable-access.test.ts` | Pure decision functions plus HTTP checks | 9 access + 3 gate tests | Verified |

### Publication gate

The reference refused runs whose status was not FEASIBLE or that recorded hard conflicts. ExamOpt additionally requires:

1. the run comes from the ExamOpt engine, not a legacy writer;
2. a passing validation report was stored when the run was generated;
3. the saved assignments pass all 10 rules again against today's data;
4. the stored invigilator duties break no rule;
5. the run is not already the active version.

The server re-evaluates the gate on every publish request. Over HTTP, publishing the current active v4 (a legacy run) is refused with `ALREADY_ACTIVE` and `LEGACY_RUN`.

## Backend status

| Capability | Status | Evidence |
|---|---|---|
| Conflict graph | IMPLEMENTED AND VERIFIED | Reference weights reproduced; live graph from actual enrollments |
| First-Fit / Welsh-Powell / Backtracking | IMPLEMENTED AND VERIFIED | Reference tests ported; 20/20 Test Lab cases |
| Room allocation | IMPLEMENTED AND VERIFIED | Capacity and room type checked by the independent validator |
| Invigilator allocation and validation | IMPLEMENTED AND VERIFIED | Unit, Test Lab, and live persistence round trip |
| Independent schedule validator (10 rules) | IMPLEMENTED AND VERIFIED | Phase 2; re-run on every run, detail view and publish |
| Dataset quality validator | IMPLEMENTED AND VERIFIED | Reference codes; live score 100 |
| CSV dry-run validation | IMPLEMENTED AND VERIFIED (unit) | UI path not exercised in a browser |
| Diagnostics | IMPLEMENTED AND VERIFIED | Adds `INVIGILATOR_SHORTAGE` (warning; never changes feasibility) |
| Metrics, including the reference score | IMPLEMENTED AND VERIFIED | Formula tests |
| In-memory benchmark | IMPLEMENTED, NOT VERIFIED | Typed and built; not called over HTTP |
| Persistence | IMPLEMENTED AND VERIFIED | Live write test: assignments and faculty ids read back identically |
| Publication | PARTIAL | Gate verified (unit, Test Lab, live, HTTP refusal); a successful live publish was not run |
| Published / student / faculty retrieval | IMPLEMENTED AND VERIFIED | Live integration and HTTP |
| CSV export | IMPLEMENTED AND VERIFIED | Unit, live and HTTP |
| Authorization | IMPLEMENTED AND VERIFIED (unit) | Admin on all scheduling, data and roster routes. `/api/v1/students` and `/api/v1/metrics` were tightened to admin; `/student-portal` no longer answers anonymously. Production sign-in with a student account was not exercised. |

## Frontend status

| Page | Route | Main functionality | Backend / database | Auth | Tests | Responsive | Status |
|---|---|---|---|---|---|---|---|
| Overview | `/admin` | Live counts, run and publication status | `/metrics` → canonical tables | admin | build | existing layout | Updated copy (it said the solver was a future phase); not browser-verified |
| Data workspace hub | `/admin/data` | Live counts plus the data quality report | `/metrics`, `/scheduling/data-quality` | admin | build | 1–3 column grid | Rebuilt (was hard-coded); not browser-verified |
| Rooms / subjects / groups | `/admin/data/*` | CRUD on canonical tables | repository | admin writes | existing | existing | Room deletion now refused while runs reference the room (the FK cascade would delete run history) |
| Time slots | `/admin/data/time-slots` | CRUD on `timeslots` | repository | admin writes | build | existing | **Fixed:** previously wrote `time_slots`, which the scheduler never reads; deletes are guarded |
| Students | `/admin/data/students` | Directory with backlog exams and filters | `/students` → canonical tables | admin | build | table scrolls | Rebuilt (was 14 hard-coded rows) |
| Faculty | `/admin/data/faculty` | Roster, unavailability, published duties vs cap | `/faculty` | admin | build | table scrolls | Rebuilt (was static) |
| Constraints | `/admin/constraints` | Validator rules, invigilation rules, default weights, live fixed slots and blackouts | `/scheduling/readiness` | admin | build | 1–2 columns | Rebuilt (had invented figures); read-only |
| Optimization Lab | `/admin/optimization` | Phase 2 features plus invigilator coverage, reference score, data quality report | runs API | admin | build | Phase 2 verified | Extended; new parts not browser-verified |
| Timetable | `/admin/schedules` | Phase 2 views, plus publish dialog with gate reasons, CSV export, invigilator per exam, invigilation status, publication history | runs, publish, publications, export | admin | build | existing | Extended; not browser-verified |
| Conflict Analysis | `/admin/conflicts` | Unchanged (Phase 2) | conflict-graph API | admin | Phase 2 | Phase 2 | Verified in Phase 2 |
| Test Lab | `/admin/test-lab` | 20 cases, including the reference cases; category filter scrolls on narrow screens | test-lab API | admin | unit (20/20) | category filter scrolls | Verified (unit and service) |
| Schedule history | `/admin/optimization` (Saved runs), `/admin/schedules` | History, comparison, publication history | runs, publications | admin | integration | — | Verified (API) |
| Publication | `/admin/schedules` | Gate-driven publish button and dialog | publish route | admin | gate tests | dialog | PARTIAL: no live publish executed |
| Analytics | `/admin/analytics` | Latest run per strategy, gap histogram, seat fill by room type and program | `/benchmarks`, `/scheduling/published` | admin | build | grid | Rebuilt (had invented figures) |
| Import & Export | `/admin/import` | Published CSV exports; CSV dry-run validation with reference samples | export, data-quality | admin | unit | stacks | Rebuilt (buttons did nothing; export used static data). Writing imported rows is not implemented. |
| Student timetable | `/student` | Signed-in student's published exams; admin lookup by roll number; print | `/timetable/student` | signed in; own record only | access tests, HTTP | single column | Rebuilt (generated fake data for any roll number); renders over HTTP |

## Database status

- **Canonical tables used:** `rooms`, `timeslots`, `subjects`, `student_groups`, `student_enrollments`, `student_subject_enrollments`, `faculty`, `scheduling_runs`, `scheduled_exams`, `published_schedules`, `schedule_conflicts`.
- **Newly read:** `faculty` (scheduler and roster). **Newly written:** `scheduled_exams.assigned_faculty_id` (column already existed) and `published_schedules` (only through the gated publish route).
- **Schema changes and migrations:** none.
- **Data preserved:** reads only, except one integration run (`triggeredBy: integration-test`), which adds a run as Phase 2's write test did. No delete, truncate or reseed. No change to published versions.
- **Fingerprint:** the dataset fingerprint now includes the faculty roster (`86bc09e0`; it was `879aa685` without faculty). Engine runs from before this phase therefore show "dataset changed since run". They still re-validate, and can still be published if they pass the gate.
- **Unresolved:** `user_profiles` is keyed to Supabase-auth ids and is unused with Clerk. The Prisma schema still does not match the live tables (pre-existing). `/api/v1/health` reports the Prisma database check as `error` (pre-existing; the PostgREST data path works).

## Verification

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **Pass, 0 errors** |
| Lint | `npm run lint` | **0 errors**, 40 warnings (all pre-existing unused-directive warnings) |
| Unit tests | `npm test` | **111 passed, 8 skipped** (15 files; the skips are the integration suite, which needs the env flag). New: `reference.test.ts` (19), `timetable-access.test.ts` (12), plus 6 new Test Lab cases (74 before + 37 = 111) |
| Integration tests | `EXAMOPT_INTEGRATION=1 EXAMOPT_INTEGRATION_WRITE=1 npx vitest run tests/integration` | **7 passed, 1 skipped** against live Supabase: reference fingerprint equality, data quality 100, persist and read back with invigilators, gate allows a fresh feasible run, CSV export, legacy run refused, published/student/faculty retrieval. Skipped: the live publish write (`EXAMOPT_INTEGRATION_PUBLISH=1`). |
| Build | `npm run build` | **Pass**; all new routes and pages compiled |
| Doctor | `npm run doctor` | **System is READY** |
| Project audit | `npm run audit:project` | Equivalent to the three checks above, all passing |
| HTTP (dev server, demo admin) | manual | 200: health, data-quality, published, student by roll number, rooms export, `/student`. 400: unscoped admin student request, injected `role` field, malformed roll number. 404: unknown run export. 409: publishing the legacy active run. Admin pages redirect unauthenticated requests to sign-in. |
| Browser UI | — | **Not run in this phase.** Admin pages need a Clerk session, and no browser automation was available. Pages are typed and built, but not visually checked at 1440 px or 390 px. |

## Security notes

- Scheduling, data-quality, roster, student-directory and metrics routes require `admin`. Request bodies are strict, so injected `role` or user fields are rejected.
- Student and faculty records are scoped by Clerk `publicMetadata`, read server-side. A roll number in the request is never proof of identity.
- **Rotate secrets:** the Phase 2 rotation notice still applies (Supabase service-role key, database password, Clerk secret key). `hackvision/.env` holds a copy of credentials. It was not read for values, copied or printed.

## Remaining work

Missing functionality:

1. **A live publish has not been executed.** Run `EXAMOPT_INTEGRATION=1 EXAMOPT_INTEGRATION_PUBLISH=1 npx vitest run tests/integration`, or use the Timetable page. This makes a new engine run version 5, the active timetable, and keeps v4 as history. It needs your approval because it changes what students see.
2. **Student and faculty account linkage.** Set `publicMetadata.rollNo` or `publicMetadata.facultyId` on Clerk users. Until then, non-admin users get `NOT_LINKED`. There is no self-service linking or admin UI for this.
3. **Browser verification** of the rebuilt and extended pages at desktop and mobile widths, with a Clerk admin session.
4. **Constraint editing.** Fixed slots and unavailable slots for subjects, rooms and faculty are shown but can only be changed in the database. The subject and room forms lack these fields.
5. **Import writes.** CSV files can be validated but not applied.
6. **Faculty CRUD** (roster is read-only), and manual timetable edits with validator-gated saves.
7. **Atomic publication.** Insert-then-retire through PostgREST is not one transaction. A failure in between leaves two active rows, and readers take the newest. A Postgres function would make it atomic.
8. **Asynchronous runs and cancellation** (unchanged from Phase 2).

Optional later polish (not missing functionality): visual refinement of the rebuilt pages, charts in place of bar rows on Analytics, and a "Student view" link in the admin sidebar.

## Files changed in this phase

- **New (server):** `server/scheduling/{invigilation,data-quality,export,publication,reference-dataset,reference-samples,schemas}.ts`.
- **New (routes):** `app/api/v1/scheduling/{data-quality,export,publications,published}/route.ts`, `app/api/v1/scheduling/runs/[runId]/publish/route.ts`, `app/api/v1/timetable/{student,faculty}/route.ts`, `app/api/v1/faculty/route.ts`.
- **New (UI):** `components/scheduling/{publish-panel,quality-report,student-timetable,constraints-view,analytics-view}.tsx`, `components/examopt/{data-hub,import-export}.tsx`.
- **New (tests):** `tests/unit/scheduling/reference.test.ts`, `tests/unit/timetable-access.test.ts`.
- **New (docs):** `docs/examopt/REFERENCE_BACKEND_INVENTORY.md`, this file.
- **Modified (server):**
  - `server/scheduling/{domain,engine,loader,metrics,normalize,persistence,service,test-lab}.ts`;
  - `server/api/index.ts`, `server/examopt/repository.ts`, `modules/auth/access.ts`.
- **Modified (routes):** `app/api/v1/{metrics,students,student-portal,time-slots,time-slots/[id],scheduling/compare,scheduling/runs}/route.ts`.
- **Modified (pages):**
  - `app/(admin)/admin/{analytics,constraints,import}/page.tsx`;
  - `app/(admin)/admin/data/{page,students/page,faculty/page}.tsx`;
  - `app/student/page.tsx`.
- **Modified (components):** `components/scheduling/{api,optimization-lab,run-views,test-lab,timetable}.tsx`, `components/examopt/{dashboard-overview,resource-workspace}.tsx`, `components/navigation/admin-sidebar.tsx`.
- **Modified (tests):** `tests/integration/scheduling.test.ts`, `tests/unit/scheduling/test-lab.test.ts`.
- **Not touched:**
  - the landing-page hero and its in-progress files (`app/sections/hero.tsx`, `components/navigation/examopt-nav.tsx`, `components/ui/orbital-image-wheel.tsx`, `components/unlumen-ui/`, `public/Images/challenges/`, `scripts/copy-challenge-images.mjs`, `.gitignore`);
  - `hackvision/`. Its 22 uncommitted changes predate this session (latest 14:06).
