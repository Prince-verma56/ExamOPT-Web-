# Final integration plan

Written 2026-10-16 after auditing the workspace, before this phase's code changes.

## 1. Project boundaries (as found)

| Path | Git | Role | Policy this phase |
|---|---|---|---|
| `/` (root) | `Prince-verma56/ExamOPT-Web-`, branch `main` | Canonical web app and backend (Next.js 16, Clerk, Supabase PostgREST) | Modify. No commits. |
| `hackvision/` | **Separate nested repo** `prakhyat798/ExamOpt`, branch `main`; ignored by the root `.gitignore` | Reference project | Many uncommitted changes from other work (backend, frontend, docs). Leave untouched. |
| `hackvision/backend/`, `hackvision/frontend/` | inside `hackvision` | Reference FastAPI backend and React frontend | Read-only. |
| `hackvision/examopt_mobile/` | inside `hackvision`, **untracked** (`?? examopt_mobile/`) | Flutter client (designated mobile target) | Modify. There is no history to preserve, so every change is listed in the mobile audit. |
| `docs/` | root, but ignored by the root `.gitignore` | Audit documents | Written here; not visible in `git status`. |

Toolchain: Flutter (Dart 3.12.2) and Java 26 are installed. `ANDROID_HOME` is unset; `flutter doctor` decides whether an APK can be built. Playwright is not installed.

## 2. Architecture (as found)

- One data path: `lib/supabase.ts` `querySupabase` → PostgREST with the service role, server only. Used by `server/scheduling/loader.ts` (scheduler) and `server/examopt/repository.ts` (CRUD).
- Prisma (`server/db`) is configured but does not match the live schema. It is still imported by `server/audit` (audit writes), so audit records go nowhere useful. No new Prisma use will be added.
- Auth: Clerk. `createApiRoute` calls `auth()`, which accepts a cookie session (web) or `Authorization: Bearer <session JWT>` (mobile). Roles are decided server-side. The student roll number comes from Clerk `publicMetadata.rollNo`, a server-side link registry (JSON file on disk), or an env mapping.
- Student-facing API already present: `GET /api/v1/access`, `GET /api/v1/timetable/student`, `GET /api/v1/timetable/faculty`, `GET /api/v1/scheduling/published`.

## 3. Gaps found

| # | Gap | Evidence |
|---|---|---|
| G1 | **The mobile app does not use the canonical backend.** It calls the reference FastAPI on `:8000` (`/api/v1/auth/login`, `?roll_no=` query), hard-codes `10.0.2.2:8000`, and **falls back to hard-coded fake profiles and timetables** when any call fails. Its `roll_no` parameter would be identity by request parameter. | `lib/services/api_service.dart` |
| G2 | CSV import is validation only; nothing is persisted. Entity exports do not exist (only timetable, room and invigilation exports). | `schedulingService.validateUpload`, `/admin/import` |
| G3 | Demo scenarios lack backlog/cross-semester and genuine-bottleneck (preflight) cases. The guided demo is a caption bar, not an explanation. | Judge demo review, screenshots |
| G4 | The arena runs each algorithm twice (timed plus traced). The brief prefers one measured, traced run, with any untraced benchmark labelled separately. | `runArena` |
| G5 | Room `AB11-101` is `LAB` live, `THEORY` in every seed source (`supabase/complete_setup_and_seed.sql`, `hackvision/supabase/*.sql`, the reference `rooms.csv`, `seed_generator.py`). No audit trail exists; no script in either repo changes it. | Live diff, grep |
| G6 | The Subjects table renders `requiresLab` as "Available"/"Inactive" (the generic boolean branch catches it first). | Screenshot, `resource-workspace.tsx` |
| G7 | No browser end-to-end tooling. | `package.json` (`test:e2e` is an echo) |
| G8 | The student link registry is a JSON file on the server's disk: lost on serverless redeploys. | `modules/auth/student-links.ts` |

## 4. Implementation order

1. Re-run all checks; fix G6.
2. Demo engine: one traced run per algorithm, plus an optional, labelled untraced benchmark (G4). Scenario catalogue A–H, adding backlog/cross-semester (B) and a preflight bottleneck (H) on in-memory variants of the live snapshot (G3).
3. Guided demo: stepper with "What you are seeing / Why it matters / What the system did / What the result means / What happens next", Reset Demo, and a mini graph next to the trace.
4. CSV (G2): one shared parser and validator per entity → dry-run endpoint → commit endpoint (upsert on the primary key, only when every row is valid, `insert`/`upsert` modes, never replace) → entity export in the same columns → templates. Students and their enrollments are written in an order that compensates on failure, because PostgREST offers no cross-table transactions and DDL (RPC functions) cannot be applied from this environment.
5. Mobile (G1): Clerk native sign-in through the Frontend API (publishable key only) → Bearer session JWT, refreshed before expiry → `/api/v1/access` and `/api/v1/timetable/student`. Remove all fake fallbacks. Base URL from `--dart-define=API_BASE_URL` (debug default `http://10.0.2.2:3000`; release builds require it). Then analyze, test, debug APK.
6. AB11-101 (G5): a reversible correction script (dry run by default; backup and revert) plus an in-memory consequence analysis. Applied only with the owner's confirmation, because whether the edit was intentional cannot be established.
7. Browser end-to-end (G7) if feasible without weakening authentication.
8. Final audits and verification report.

## 5. Constraints honoured

No destructive SQL, no schema reset, no new database, no reference-code edits, no commits, no auth bypass in production, no secrets in the APK, and no change to the active publication.
