# ExamOpt Phase 2 audit: scheduling engine, conflict graph, room allocation, Algorithm Arena

Date: 2026-10-16 · Engine version 2.0.0 · Live dataset fingerprint `879aa685`

The data mapping is in [PHASE_2_DATA_AUDIT.md](./PHASE_2_DATA_AUDIT.md).

**Status key**

| Status | Meaning |
|---|---|
| **VERIFIED** | Implemented and verified by automated tests and/or live execution |
| **IMPLEMENTED** | Implemented but not verified |
| **PARTIAL** | Partly done |
| **BLOCKED** | Cannot proceed |
| **NOT IMPLEMENTED** | Not started |
| **OUT OF SCOPE** | Deliberately excluded from this phase |

## Results on the live dataset

All three strategies ran on the identical dataset (24 exams, 355 students, 1,735 enrollments, 15 rooms, 10 slots) with the default configuration. Each result was checked by the independent validator and saved.

| Rank | Algorithm | Outcome | Scheduled | Hard violations | Slots · days | Extra same-day exams | Back-to-back pairs | Seat fill | Soft penalty | Time |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Backtracking | FEASIBLE | 24/24 | 0 | 10 · 5 | 110 | 110 | 87.2% | 445.05 | ~2–30 ms (24 nodes) |
| 2 | Welsh-Powell | FEASIBLE | 24/24 | 0 | 6 · 3 | 730 | 1,255 | 86.3% | 3,449.25 | <2 ms |
| 3 | First-Fit | PARTIAL | 23/24 | 0 | 6 · 3 | 650 | 1,175 | 77.0% | 3,131.45 | <2 ms |

How to read these results:

- **First-Fit is legitimately unable to place BCADS-502.** In id order it puts BCADS-303 into D2-M before reaching BCADS-502, which is fixed to D2-M and shares 80 students with BCADS-303. The diagnostic says exactly this. A heuristic failure is reported as PARTIAL, never as infeasible.
- **The ranking puts First-Fit last even though its soft penalty is lower than Welsh-Powell's.** This is the feasibility-first rule working as intended.
- **Welsh-Powell reaches the proven minimum of 6 slots** (the clique lower bound equals the colouring), but it compresses the exams into 3 days.
- **Backtracking spreads the exams over 5 days.** It cuts the extra same-day exams from 730 to 110 and the back-to-back pairs from 1,255 to 110, at the cost of using all 10 slots.
- **Optimality is not claimed for any soft metric.** Only the 6-slot minimum is proven.

## Backend

| Capability | Status | Evidence / notes |
|---|---|---|
| Data normalisation | **VERIFIED** | `server/scheduling/normalize.ts` parses clocks, ranges and delimited slot lists, and derives backlog enrollments (120 live). Covered by unit tests and the `backlog-cross-semester` Test Lab case. Live load pages past the 1,000-row PostgREST cap (integration test). |
| Conflict graph | **VERIFIED** | `conflict-graph.ts` builds the graph from actual enrollments: shared and backlog-shared counts per edge, degree, clique lower bound, Welsh-Powell upper bound, isolated and highly constrained exams. Deterministic ordering. Live: 24 nodes, 64 edges. |
| First-Fit baseline | **VERIFIED** | Id order, earliest permissible slot, first free room in id order. Fails honestly on live data (PARTIAL). |
| Welsh-Powell | **VERIFIED** | Degree-descending order (ties broken by students, then id). Fixed-slot exams are pre-placed. Colours are swept slot by slot, with best-fit rooms. Fixed, unavailable, capacity and laboratory constraints are enforced during assignment. |
| Constraint-aware backtracking | **VERIFIED** | Complete search over (slot, room) pairs. MRV with degree tie-break, forward checking on student and room constraints, value ordering that spreads exams across days and then minimises wasted seats. Node and time limits. Exhausting the search is reported as INFEASIBLE (proven); reaching a limit is reported as SEARCH_LIMIT. |
| Room allocation | **VERIFIED** | Policy: **one room per exam**, as required by `scheduled_exams` UNIQUE (run_id, subject_id). Room type must match: practical exams use laboratories, and theory exams never use laboratories. Capacity is checked against actual enrollment. Room unavailability and overlapping slots are respected. Best fit (smallest suitable free room) is used by Welsh-Powell and backtracking; first fit by the baseline. Splitting an exam across rooms is not supported, and the diagnostic says so. |
| Independent validator | **VERIFIED** | `validator.ts` imports nothing from the solvers, model or graph. It checks 10 rules (completeness, student overlap, room double-booking, capacity, room type, fixed slot, unavailable exam or room slot, duration, references, uniqueness) and handles partially overlapping slots. Student overlaps are reported as counts, never names. |
| Invalid schedules can never be FEASIBLE | **VERIFIED** | `classifyOutcome`: any placement violation → INVALID. `runStore.save` refuses to store FEASIBLE without a passing validation. Unit test plus the `independent-validation` Test Lab case. |
| Soft metrics | **VERIFIED** | Formulas below. Hard violations are never folded into the soft score. |
| Scheduling diagnostics | **VERIFIED** | Structured `Diagnostic` objects: code, severity, kind (data / constraint / search), constraint, affected exams, rooms and slots, remediation, and a `provesInfeasible` flag. Data errors block the solver (outcome INVALID_INPUT). |
| Preflight infeasibility proofs | **VERIFIED** | Only necessary conditions are used: an exam with no permissible slot or suitable room; a fixed slot that contradicts unavailability or duration; two fixed exams in overlapping slots that share students; a Hall-deficient exam → (room, slot) matching; a clique larger than the maximum set of disjoint slots. |
| API integration | **VERIFIED** | `GET /api/v1/scheduling/readiness`, `GET …/conflict-graph`, `GET/POST …/runs`, `GET …/runs/[runId]`, `GET …/compare?runIds=`, `GET/POST …/test-lab`. `/api/v1/schedules`, `/benchmarks` and `/validate` now serve real data instead of constants. All use `createApiRoute`: Zod (strict, so unknown fields such as `role` are rejected), normalised errors, request ids, and rate limits on POST. Checked live: 400 for malformed, duplicate or unknown input, 404 for unknown runs. |
| Database persistence | **VERIFIED** | Writes `scheduling_runs`, `scheduled_exams` and `schedule_conflicts` using a commit-marker protocol (see Known issues). Every engine run read back as `committed`. The integration test persists a run and reads it back identically. |
| Search limits and failure recovery | **VERIFIED** | The node limit is deterministic; the time limit is checked every 128 nodes. On a failed write, compensating deletes remove the partial rows, and readers ignore uncommitted runs. |
| Authorization | **VERIFIED** (unit) / **IMPLEMENTED** (production end-to-end) | See Security. Unit tests cover every branch of `decideAccess`. A production deployment with a non-admin account was not exercised end to end. |
| Background jobs | **OUT OF SCOPE** | Runs complete in milliseconds on this dataset, so execution is synchronous: one request per algorithm, with the time limit capped at 10 s and `maxDuration = 60`. The existing job provider depends on a Prisma `jobs` table that does not exist in Supabase. The service contract already returns a run id and status, so an asynchronous runner can be added later. |
| Cancellation | **NOT IMPLEMENTED** | Each run is bounded by its own time limit, and the UI says so plainly. There is no inert cancel button. |
| AI | **OUT OF SCOPE** (by design) | No AI is on the correctness path, and no API key is required. |

## Frontend

| Capability | Status | Evidence / notes |
|---|---|---|
| Optimization Lab (`/admin/optimization`) | **VERIFIED** | Includes: dataset readiness strip (live counts), preflight status, proven minimum slots, an expandable diagnostics list, and the dataset fingerprint. Strategy selector with honest guarantees for each algorithm. Search-budget and soft-weight configuration. A floating run bar showing real elapsed time. Each algorithm is a separate request, so per-strategy progress is real. Checked in headless Chrome at 1440 px and 390 px with no console errors and no horizontal overflow. |
| Algorithm selection and run states | **VERIFIED** | Queued, running, done and error states per strategy. Toasts on completion and on persistence failure. A warning appears if the dataset fingerprint changes mid-batch. |
| Results and comparison table | **VERIFIED** | Result cards include outcome badge, validation (x/10 rules), metrics, and a soft-penalty composition bar. The ranked comparison is feasibility first; "best value" highlighting applies to feasible runs only. A Saved runs tab supports multi-select comparison and warns when fingerprints differ. A detail sheet shows the validation checklist, penalty breakdown, diagnostics, unscheduled exams and configuration. |
| Timetable (`/admin/schedules`) | **VERIFIED** | Run selector (defaults to the active published run). A live re-validation banner, which shows legacy runs being validated for the first time. Live metrics. Three views: Calendar (days × sessions, with a program rail, lab and fixed-slot icons, and a seat-fill micro-bar), Rooms (rooms × slots matrix with hatched, locked blackout cells) and List. Program filter, search, and an exam detail sheet with per-exam violations. Read-only, with the deferral stated on the page. |
| Conflict Analysis (`/admin/conflicts`) | **VERIFIED** | Custom SVG, so no graph dependency was added. Deterministic ring layout grouped by cohort. Node size encodes students; edge width encodes shared students. Dashed edges mark backlog / cross-cohort conflicts, so the encoding does not rely on colour alone. Hover and focus preview; click or Enter pins a node; Escape clears. Includes a search box, "focus selection" and "backlog only" filters, an inspector with neighbours ranked by shared students, and table views (conflict pairs and exams) as the accessible alternative. |
| Diagnostic explanations | **VERIFIED** | Reusable `DiagnosticList`: severity rail, code, kind and constraint, a "Proves infeasibility" tag, entity chips and a suggested action. |
| Test Lab (`/admin/test-lab`) | **VERIFIED** | 14 deterministic cases with 51 assertions. The page shows expected vs actual, the assertions, per-algorithm outcome, nodes and time, and diagnostics. Cases can be run all at once or one at a time. Live: 14/14 pass. |
| Loading, empty and error states | **VERIFIED** | Skeletons, dashed empty states with next actions, retry buttons, and 401/403-aware messages. |
| Responsive behaviour | **VERIFIED** | Wide grids scroll inside their own container; stat strips and cards reflow. Overflow checked at 390 px. |

Test Lab cases:

1. Normal feasible schedule
2. Two exams sharing one student
3. Cross-semester backlog conflict
4. Room-capacity overflow
5. Required laboratory unavailable
6. Fixed-slot conflict
7. Unavailable time slot respected
8. Insufficient available rooms
9. Invalid and duplicate input
10. Over-constrained clique
11. Impossible case proven by exhaustive search (odd cycle)
12. Search limit reached
13. Independent validation (including a tampered schedule)
14. Deterministic output

## Soft-metric formulas

All metrics are computed only from saved assignments and actual enrollments (`server/scheduling/metrics.ts`).

| Metric | Definition |
|---|---|
| `seatFillPct` | Σ enrolled students ÷ Σ capacity of the rooms used × 100 |
| `capacityWasteSeats` | Σ (room capacity − enrolled students) |
| `sameDayExtraExams` | Σ over (student, day) of max(0, exams that day − 1) |
| `backToBackPairs` | Pairs of a student's consecutive exams in chronologically adjacent slots, including evening → next morning |
| `gapHistogram` | Distance in slots between each student's consecutive exams: 1, 2, 3, 4+ |
| `compactnessPct` | slots used ÷ (last used slot − first used slot + 1) × 100 |
| `daysUsed`, `slotsUsed`, `unusedSlots` | Counts |
| **Soft penalty** | `sameDay·sameDayExtraExams + backToBack·backToBackPairs + capacityWaste·(capacityWasteSeats ÷ 100) + daysUsed·daysUsed`. Default weights are 3, 1, 1 and 0.5, configurable per run. Lower is better. The breakdown is stored and displayed for every run. |
| **Ranking** | Outcome (FEASIBLE < PARTIAL = SEARCH_LIMIT < INFEASIBLE < INVALID < INVALID_INPUT), then unscheduled count, then soft penalty, then execution time. Legacy (unverified) runs rank after all engine runs. |

## Security

| Item | Status |
|---|---|
| Admin by default | **Fixed.** `resolveAccess` previously made every signed-in user an admin, and gave anonymous requests a demo admin whenever `FEATURE_DEMO_MODE=true` **or** the build was not production. The rule now lives in `modules/auth/access.ts`: the demo principal exists only when `FEATURE_DEMO_MODE=true` **and** `NODE_ENV !== "production"`. In production, admins come from `EXAMOPT_ADMIN_USER_IDS` or `EXAMOPT_ADMIN_EMAILS`, or from Clerk `publicMetadata.role === "admin"` (read server-side and cached for 60 s). Everyone else is `user`. |
| Scheduling endpoints | All require `admin`. The triggering user is taken from the verified session (`ctx.userId`) and stored as `triggeredBy`. Request bodies are `.strict()`, so a client cannot inject a role or user id. |
| Secrets | `.env` is untracked: `git check-ignore` matches `.gitignore:35`, and no `.env` file appears in `git ls-files`. Service-role access stays server-side (`lib/supabase.ts` and the loader/persistence modules are `server-only`). |
| **Secret rotation required** | After the screenshot exposure, rotate: the Supabase **service-role / secret key** (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`); the **database password** embedded in `DATABASE_URL` and `DIRECT_URL`; and the Clerk **secret key** (`CLERK_SECRET_KEY`). The anon and publishable keys are public by design, but are worth regenerating together with the others. A copy of `.env` also exists at `hackvision/.env` (ignored by `hackvision/.gitignore`); update it as well. |
| Production configuration | `.env.production.example` now sets `FEATURE_DEMO_MODE=false` and documents the admin allowlist variables. **Before deploying, set `EXAMOPT_ADMIN_EMAILS`, or judges will be signed in as non-admins.** |

## Verification

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` | **74 passed, 4 skipped** (12 files). New: `tests/unit/scheduling/engine.test.ts` (26), `tests/unit/scheduling/test-lab.test.ts` (16), `tests/unit/access.test.ts` (5). The pre-existing 27 still pass. |
| Integration tests | `EXAMOPT_INTEGRATION=1 EXAMOPT_INTEGRATION_WRITE=1 npx vitest run tests/integration` | **4 passed** against live Supabase: load, solve plus independent validation, list / re-validate / compare, persist and read back. The write test adds one run (`triggeredBy: integration-test`). |
| Typecheck | `npm run typecheck` | **Fails, only because of `hackvision/frontend`** (see Known issues). With that folder excluded: **0 errors**. |
| Lint | `npm run lint` | **Fails, only because of `hackvision/`** (1,675 errors there). `npx eslint --ignore-pattern "hackvision/**"`: **0 errors** (40 pre-existing warnings). The pre-existing Phase 1 errors in `conflicts/page.tsx` (page rewritten) and `resource-workspace.tsx` (documented directive) are resolved. |
| Build | `npm run build` | **Compiles; type-check fails only on `hackvision/frontend`.** A copy of the project without that folder builds successfully, including every new scheduling route and page. |
| Doctor | `npm run doctor` | Passes ("System is READY"). |
| Live API | Manual | Readiness, run execution, list, detail with legacy re-validation, compare, `/schedules`, `/benchmarks`, conflict graph, Test Lab endpoint (14/14), and 400/404 handling all checked against the running dev server. |
| UI | Headless Chrome via a Clerk dev sign-in token | All four pages captured at 1440 px, plus the Optimization Lab at 390 px. No console errors and no page-level horizontal overflow. Real runs were executed from the UI, so the saved-runs list contains extra runs from these checks. |
| Database | PostgREST queries | Every engine run has `metadata_json.persistence = "committed"`. Assignments and conflicts are present. |

## Known issues

1. **A separate project was copied into the repository root at 14:31** (`hackvision/`, with its own `.git`, a Python backend and a Vite frontend). Because `tsconfig.json` and ESLint include it, `npm run typecheck`, `npm run lint` and `npm run build` fail on its files. It was left untouched. Fix by moving it out of this repo, or by adding `"hackvision"` to `tsconfig.json` `exclude` and to the ESLint ignores.
2. **Another process is writing to the scheduling tables.** Legacy-format runs and published version 4 appeared during this phase, probably from `hackvision/backend`. Those runs are shown as *Unverified* and re-validated live when opened; the active published run currently passes all 10 rules.
3. **No multi-statement transactions through PostgREST.** Persistence uses a commit marker with compensating deletes instead. A crash between statements leaves an uncommitted run that readers ignore but that is not automatically removed. A Postgres function (`persist_scheduling_run`) would make the write truly atomic. It needs a direct database connection to install, and that connection is unavailable from this network.
4. **Time-limit stops are not reproducible across machines.** Node-limit stops are.
5. **Prisma's schema does not match the live tables** (pre-existing; see the data audit). The scheduler does not use Prisma.
6. Clerk development keys produce a console warning in development only.

## Next phase (Phase 3)

- **Publishing workflow.** Publish only engine runs that are FEASIBLE and pass validation; create a new `published_schedules` version; never overwrite or deactivate silently.
- **Validated manual edits.** Move or swap an exam in the timetable, with the validator gating every save.
- **Invigilator assignment.** Use `faculty.unavailable_slots` and `max_duties`, and set `scheduled_exams.assigned_faculty_id`.
- **Asynchronous runs** for larger datasets, through a job table that actually exists in Supabase, with cancellation.
- **Student portal on real data.** Serve the published run, filtered by the student's enrollments (the portal still uses static Phase 1 data), and feed the Flutter app from the same API.
- **Exports from saved runs.** The Import & Export page still exports the static Phase 1 timetable.
- **A database transaction function** for persistence, once a direct database connection is available.
- **Optional AI assistance** for explaining verified results or drafting constraints. Every proposal would be confirmed and validated, and kept off the correctness path.
