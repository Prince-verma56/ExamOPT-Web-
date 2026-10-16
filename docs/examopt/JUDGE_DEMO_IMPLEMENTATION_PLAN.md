# Judge Demo Studio — implementation plan

Written 2026-10-16, before the Demo Studio code was added. It records what the
preflight audit found in the source, not what earlier reports claimed.

## 1. Existing capabilities (verified in source)

| Capability | Where | Verified how |
|---|---|---|
| Conflict graph from enrollments (shared and backlog counts per edge, degree, student count) | `server/scheduling/conflict-graph.ts` | Read; unit tests in `tests/unit/scheduling/engine.test.ts` |
| Indexed model: candidate slots, best-fit room lists, slot overlap, `Occupancy` | `server/scheduling/model.ts` | Read |
| First-Fit (id order, earliest slot, first free room) | `server/scheduling/algorithms.ts` | Read; Test Lab |
| Welsh-Powell (degree order, fixed slots first, one slot per colour, best-fit room) | same | Read; Test Lab |
| Backtracking (MRV + degree tie-break, forward checking, value ordering, node and time limits) | same | Read; Test Lab `search-timeout`, `odd-cycle-search-proof` |
| Independent validator, 10 rules, shares no code with solvers | `server/scheduling/validator.ts` | Read |
| Preflight (data errors, necessary-condition infeasibility proofs, Hall matching, clique bound) | `server/scheduling/preflight.ts` | Read |
| Outcome classification (validator decides FEASIBLE) and ranking (invalid never outranks valid) | `server/scheduling/engine.ts` | Read |
| Publication gate | `server/scheduling/publication.ts` | Read; Test Lab `publication-gate` |
| Test Lab, 20 deterministic cases | `server/scheduling/test-lab.ts` | `npx vitest run tests/unit`: 107/107 pass |
| Tampered-schedule fixture: BCA-102 moved onto BCA-101 (40 shared students), MCA-102P (60 students) in LAB-50 (50 seats), duplicate BCA-301 | `independent-validation` case on `campusMini()` | Read; passes |
| Data access: Supabase PostgREST via `querySupabase`, service role, server only | `server/scheduling/loader.ts` | Read |
| Admin authorization: `createApiRoute({ requiredPermissions: ["admin"] })` on every scheduling route; admin layout redirects non-admins | `server/api/index.ts`, `app/(admin)/layout.tsx` | Read |

## 2. Build blockers (status at audit time)

| Issue | Status found | Fix |
|---|---|---|
| `TS2322` `DialogTrigger asChild` in `components/examopt/student-link-modal.tsx` | **Present.** The dialog wraps Base UI, whose triggers take `render`, not `asChild` | Use `render={<Button … />}` like the rest of the codebase |
| `react-hooks/set-state-in-effect` in the same modal | **Present.** Links were fetched in an effect on `open` | Fetch from the `onOpenChange` event handler |
| `react-hooks/set-state-in-effect` in `animations/smooth-scroll/provider.tsx` | **Present** (one call suppressed, one not) | The only consumer reads Lenis inside a click handler, so the instance lives in a ref behind a stable `getLenis()`; no state, no suppression |
| Prisma direct connection | Not used by the scheduler; PostgREST is the canonical path | Out of scope. The demo adds no Prisma usage |

## 3. Gaps

1. Algorithms report results only; no record of the decisions that produced them.
2. No way to inject a violation into a candidate without editing data, and no repair path.
3. No page that strings readiness → graph → algorithms → injected conflict → validation → repair → revalidation together.

## 4. Design

### Trace instrumentation (no change when off)
- `server/scheduling/trace.ts`: `TraceRecorder` with a hard event cap (default 1,500). Over the cap it counts dropped events and still records `run_completed`.
- Each `solve(model, config, trace?)` takes an optional recorder. Every call site is `trace?.emit(…)`, and optional-call short-circuiting means the event object and message are never built when tracing is off. Default behaviour, ordering and results are unchanged (tested by comparing traced and untraced runs).
- Event types: `run_started`, `exam_ordered`, `exam_selected` (MRV pick), `slot_opened` (Welsh-Powell colour), `candidate_considered`, `candidate_rejected` (reason: student clash / no free room / not permitted), `room_selected`, `slot_assigned`, `forward_check_failed`, `backtrack`, `exam_unscheduled`, `search_limit_reached`, `run_completed`. Ids only: exam, slot, room; student counts, never students.
- `runAlgorithm(dataset, id, config, { trace })` passes it through.

### Sandbox simulator (pure, `server/scheduling/demo.ts`)
- Datasets: `live` (the Supabase tables read through the existing loader into memory) and `fixture` (`campusMini()`, the Test Lab fixture). Nothing is written in either case.
- Baseline: a real `runAlgorithm` on a structured clone of the input.
- Scenarios, each choosing its targets from the actual data so only the intended rule breaks where the data allows it, and reporting every violation the validator finds if more appear:
  - `STUDENT_OVERLAP`, `ROOM_DOUBLE_BOOKED`, `ROOM_CAPACITY_EXCEEDED`, `ROOM_TYPE_MISMATCH`, `SLOT_RULE_VIOLATED` (fixed slot, else unavailable slot)
  - `COMBINED`: on the fixture, the exact Test Lab `independent-validation` tamper (extracted to `fixtures.ts` so both use one implementation); on live data, overlap + capacity + lab mismatch on disjoint exams.
- Validation: the real `validateSchedule` on the tampered candidate. Explanations are the validator's own messages and remediation plus the actual figures (shared students from the graph, room capacity, enrolment, room type).
- Corrections: `repair` (re-place only the tampered exams with every other assignment pinned, using the model's `Occupancy` checks and best-fit rooms), `regenerate` (rerun a chosen algorithm on the clean input), `restore` (put the baseline placements back). The result is revalidated; failures stay visible.
- Publication: the real `publishGate` evaluated on the candidate, plus the fact that sandbox candidates are never persisted and so can never be published.

### Service and routes (admin only, read-only)
- `schedulingService.demoDataset(source)`, `.demoArena(source, algorithms, config)`, `.demoSimulate(source, request)`; none touch `runStore`.
- `GET /api/v1/scheduling/demo/dataset?source=`, `POST /api/v1/scheduling/demo/arena`, `POST /api/v1/scheduling/demo/simulate`, all `requireAuth` + `requiredPermissions: ["admin"]`, strict zod schemas, rate limits.
- `conflictGraph()` and the demo share one graph-view builder.

### UI (`/admin/demo-studio`)
- Five areas as tabs: Readiness, Conflict graph, Algorithm arena (run all + trace replay), Conflict simulator, Resolution & verification.
- Trace player: play, pause, step ±1, reset, speed, counter; the partial schedule at step *n* is rebuilt from events 0…n, so stepping back is exact. Selecting an event highlights the exam in the graph and grid.
- Guided demo: 8 manual steps over the same tabs; no auto-advance; exit at any time.
- Deep links: `?tab=&source=&algorithm=&scenario=` parsed against allow-lists; auth is enforced by the layout and routes regardless.
- Sidebar: "Judge Demo" first under Scheduling; top-bar shortcut; dashboard quick action.

## 5. Sequence
1. Blockers (done first). 2. Trace recorder + instrumentation + tests. 3. `demo.ts` + shared tamper + tests. 4. Service + routes + sandbox/authorization tests. 5. UI. 6. Navigation. 7. Typecheck, lint, unit, read-only integration, build, doctor. 8. `JUDGE_DEMO_AUDIT.md`.

## 6. Out of scope (stated, not hidden)
- CSV import remains a dry run; nothing is written to the database.
- No persistent demo mode; no change to the active publication.
