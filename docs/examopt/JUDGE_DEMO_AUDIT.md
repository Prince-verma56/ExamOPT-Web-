# Judge Demo Studio — audit

Route: `/admin/demo-studio`. First built 2026-10-16; reworked 2026-10-17 into an explained guided presentation. This file reflects the state after the rework. Plans: `JUDGE_DEMO_IMPLEMENTATION_PLAN.md`, `FINAL_INTEGRATION_PLAN.md`.

## Engine reuse (unchanged mathematics)

- First-Fit, Welsh-Powell and Backtracking (`server/scheduling/algorithms.ts`) are the same algorithms. Each `solve()` takes an optional trace recorder; every hook is `trace?.emit(...)`, so an untraced run does no extra work. A test runs 4 datasets × 3 algorithms traced and untraced and requires identical assignments, outcome and node count.
- The 10-rule independent validator, preflight, publication gate and conflict graph are reused as they are. The Test Lab tamper is shared through `tamperCampusMiniSchedule()`.

## Algorithm traces

| Item | Status |
|---|---|
| Events: run started, exam order, exam selected (incl. MRV), slot opened (Welsh-Powell colour), candidate considered, candidate rejected with reason (`STUDENT_CLASH` naming the blocking exams and shared-student count, `NO_FREE_ROOM`, `SLOT_NOT_PERMITTED` with the rule), room selected (with the suitable rooms already taken in that slot), slot assigned, forward-check failure (naming the emptied exam), backtrack, unscheduled, search limit, run completed | IMPLEMENTED AND VERIFIED |
| Bounded payload (1,500 events, final summary always kept); ids and counts only, never students (test checks all 355 student ids are absent) | IMPLEMENTED AND VERIFIED |
| **One measured, traced run per algorithm**; a separately labelled "Trace off" benchmark run is shown for fair timing, with a check that it produced the same assignments | IMPLEMENTED AND VERIFIED (changed this phase; previously two runs with the untraced one reported) |
| Player: play/pause, step ±1, slider, reset, speed, "next rejection", event counter, plain-language explanation of each event, algorithm explainer; replay rebuilt from events 0…n so stepping back is exact | IMPLEMENTED AND VERIFIED (browser) |
| Selected event highlighted on the timetable **or the conflict graph** (focus ring on the exam, amber on blocking exams) | IMPLEMENTED AND VERIFIED (browser; screenshot reviewed) |

On the live data, Backtracking places all 24 exams with 24 nodes and never backtracks, so its trace has no rejections. First-Fit's trace shows real rejections (for example BCA-102 cannot use D1-M because 60 students already sit BCA-101 there) and leaves BCADS-502 unscheduled (PARTIAL).

## Scenario catalogue (A–H)

Each scenario lists its condition, expected validator result, diagnostic category, remediation and expected outcome after correction (from `SCENARIO_META`, shown in the UI). All run on in-memory copies; targets are chosen from the data, not hard-coded.

| | Scenario | Result on live data | Correction (repair / regenerate / restore) |
|---|---|---|---|
| A | Shared-student overlap | `STUDENT_OVERLAP` only | revalidates clean |
| B | **Backlog / cross-semester conflict (new)**: two exams of different cohorts linked only by backlog or bridge students | `STUDENT_OVERLAP`, across cohorts, backlog count shown | revalidates clean |
| C | Room double-booking | `ROOM_DOUBLE_BOOKED` only | clean |
| D | Capacity overflow (fixture: MCA-102P, 60 students, in LAB-50, 50 seats) | `ROOM_CAPACITY_EXCEEDED` only | clean |
| E | Laboratory mismatch | `ROOM_TYPE_MISMATCH` only | clean |
| F | Fixed / unavailable slot | `FIXED_SLOT_VIOLATED` only | clean |
| G | Combined (fixture: the Test Lab tamper; live: three independent injections) | every rule reported separately (six codes on the fixture) | clean |
| H | **Genuine bottleneck (new)**: an in-memory variant with fewer slots than the largest clique (fixed slots kept) | preflight proves `STUDENT_CONFLICT_BOTTLENECK` (necessary condition); all three algorithms INFEASIBLE without running a solver; contrast: backtracking with a 5-node budget on the original input reports SEARCH_LIMIT, which proves nothing | restoring the slots: backtracking FEASIBLE, validator passes |

## Guided demo (reworked)

- Eight steps with a clickable stepper: meet the dataset; understand the conflict graph; compare strategies; introduce a controlled conflict; inspect the validator's finding; understand the correction; revalidate; final schedule and publication readiness.
- Each step: one heading and five labelled sections ("What you are seeing / Why it matters / What the system did / What the result means / What happens next"). The "did" and "means" sections are written from the actual results (counts, outcomes, exam ids, violation codes).
- Terms are defined in a "Terms used in this step" panel where they first matter (conflict edge, degree, clique, backlog, feasible, partial, search limit, validator, trace, sandbox, candidate, violation, publication gate). A "Technical details" panel holds the source, fingerprint and mode.
- One large visual per step: tiles, the graph, the strategy cards plus trace, the injected candidate on the graph, violation cards plus timetable, the diff, before/after timetables, and the state ladder.
- Back / Next / Reset demo / Exit. No auto-advance. The position is kept in the URL (`?guided=1&step=n`), and results persist across Back/Next (tested).
- The final step distinguishes source dataset, original candidate, injected candidate, corrected candidate, saved schedule (none is created by the demo) and published schedule (active version, read live, unchanged).
- Explore mode keeps the five tabs for free inspection, reading the same state.

## Fixes found by the browser run

- Tablet width (834 px) overflowed horizontally (header actions and the admin top bar): the page header now stacks until `lg`; top-bar shortcuts collapse to labelled icons below `xl`.
- The trace's graph view was squashed inside the narrower guided column: the graph and trace player now use container queries.
- A nested `<button>` hydration error in the guided strategy cards: they now use a stretched selection button.
- Exam ids were truncated in grid chips ("B.."): chips are now two lines with a full id and a tooltip with the subject name.

## Sandbox safety

- Unit: deep-frozen inputs survive every scenario × correction; with persistence and audit mocked as spies, no demo path calls them.
- Browser: the guided run compares `/api/v1/scheduling/published` before and after (same publication, same assignments).
- Live fingerprint `88a650da` was unchanged by the browser runs.

## Status

| Feature | Status |
|---|---|
| Traces, arena, scenarios A–H, corrections, sandbox isolation, authorization | IMPLEMENTED AND VERIFIED (unit, HTTP, browser) |
| Guided narrative, layout, stepper, reset, back/forward persistence | IMPLEMENTED AND VERIFIED (browser, three viewports, screenshots reviewed) |
| Live event streaming while a solver runs | NOT IMPLEMENTED: runs take about 1–4 ms on this data; traces are recorded and replayed |
| Persistent demo scenarios | OUT OF SCOPE (in-memory only by design) |

## Remaining usability notes

- Guided steps 4–8 need the conflict injected in step 4; until then they say so. That is intended, but a presenter who skips ahead sees placeholders.
- The live room AB11-101 is a lab (see the final verification report), so the Studio's timetables label it "· lab"; this is the real data, not a demo artefact.
