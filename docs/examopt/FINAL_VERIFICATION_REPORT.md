# Final verification report

Date: 2026-10-17. Every result below was produced by a command run in this session. "Not run" means not run.

## Web application

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **Pass, 0 errors** |
| Lint | `npm run lint` | **0 errors**, 40 warnings (all pre-existing unused-eslint-disable warnings) |
| Unit tests | `npm run test:unit` | **200/200 pass** (15 files) |
| All Vitest | `npx vitest run` | **217 passed, 8 skipped** (the skips are the env-gated live integration suite) |
| Live integration (read-only) | `EXAMOPT_INTEGRATION=1 npx vitest run tests/integration` | **5 passed, 1 failed, 2 skipped** (write and publish tests are skipped unless explicitly enabled). The failure is the reference-fingerprint check; see "AB11-101" below. |
| Browser end-to-end | `npm run test:e2e` (Playwright, Chromium; real Clerk sign-in with temporary test users, deleted afterwards; the dev server on :3000) | **23/23 pass**, with every test failing on any page or console error |
| Production build | `npm run build` | **Pass**; `/admin/demo-studio`, `/admin/import`, `/api/v1/data/*` and `/api/v1/scheduling/demo/*` compiled |
| Doctor | `npm run doctor` | **System is READY** |
| Anonymous access, production server | `next start` + curl | Every new route and every student route: **401**; `/admin/demo-studio`, `/admin/import`, `/student`: **307 → /sign-in** |

The browser suite covers: admin sign-in and sidebar navigation; Subjects lab badges; student directory from the database; Timetable publication view; the export menu on two pages; CSV invalid file (line-numbered errors, no commit); CSV preview → confirm → verified persistence → export round trip → cleanup; the full guided demo (8 steps, trace controls, inject, validator, repair, revalidation, publication state, Back keeps results, Reset); scenarios H and B; the student's own timetable; student denials (admin page, Demo Studio API, import API, another student's timetable); and 9 responsive checks (1366, 834 and 390 px × 3 routes) with no horizontal overflow.

## Mobile application (`hackvision/examopt_mobile`)

| Check | Result |
|---|---|
| `dart format` (Flutter SDK's Dart 3.13.1) | clean |
| `flutter analyze` | **No issues found** |
| `flutter test` | **13/13 pass** |
| Live sign-in and API check (`tool/verify_live.dart`, real Clerk and dev server) | **All checks pass**, including the new-device emailed-code step, own-record retrieval, and 403 for another student and for admin routes |
| `flutter build apk --debug` | **Built** with JDK 17: `build/app/outputs/flutter-apk/app-debug.apk`, SHA-256 `9dca272a097ef3bd2e1d024207feb80191441fe79300c8bb4e84cd078dcd0025` |
| On-device launch | **Not run**: no emulator image and no device attached |

## Database checks

| Check | Result |
|---|---|
| Demo Studio never writes | Unit (persistence and audit spies never called; deep-frozen inputs unchanged); browser (active publication and its assignments identical before and after the guided run) |
| CSV commit writes exactly the previewed rows | Unit (in-memory PostgREST) and browser (live: one `ZZ-E2E-*` room created, read back, exported, deleted) |
| Exports match stored values | Export → re-import is "unchanged" for all 6 entities (unit) and for live rooms (browser) |
| Enrollment relationships stay valid | Unknown groups or subjects refused; enrollments additive only; two-table write compensated on failure (unit) |
| Live data unchanged by this session's tests | Live fingerprint `88a650da` before and after the browser runs; room count back to 15 |
| Published schedule is the single source for web and mobile student views | Web `/student` (browser) and the mobile client (live check) both read `GET /api/v1/timetable/student`, which reads the active publication (v5) and revalidates it against current data |

## Security checks

- Admin-only: Demo Studio routes, CSV import and export, scheduling routes (unit route tests, browser 403s as a student, production 401s).
- Student identity comes from the verified Clerk session (cookie on the web, Bearer on mobile); a `rollNo` for anyone else returns 403 (browser and live mobile).
- No server credentials in the browser or APK. The mobile app holds only the Clerk publishable key; the secret key is used only by local test tooling, and that tooling refuses anything but an `sk_test_` key.
- Release Android builds disallow cleartext HTTP; only the debug manifest allows it.
- `FEATURE_DEMO_MODE=true` in the local `.env` makes anonymous dev-server requests a demo admin (pre-existing, development only; production refuses it, verified). Keep it unset in deployed environments.
- Playwright session states (login cookies) live in `tests/e2e/.auth/`, are deleted after each run, and are git-ignored.

## AB11-101 investigation

| Evidence | Finding |
|---|---|
| Live `rooms` row | `AB11-101`, "CSED Block AB-XI Room 101", 80 seats, **LAB** |
| Seed and generation sources | **THEORY** in `supabase/complete_setup_and_seed.sql`, `hackvision/supabase/complete_setup_and_seed.sql`, `hackvision/supabase/seed_data.sql`, `hackvision/backend/sample_datasets/normal_gla_dataset/rooms.csv`, `hackvision/backend/seed_generator.py` |
| Change history | None: room edits are not audited (the audit service writes through Prisma, which is not connected), and no script in either repository changes this field |
| Edit path | The Rooms form keeps the current type when editing, so the change came from an explicit choice of "lab" in the form or a direct database edit |
| Consequence (`scripts/room-type-correction.ts`, dry run, in memory) | Restoring THEORY makes the live fingerprint **equal to the reference** (`86bc09e0`) and the **active publication v5** goes from **6 `ROOM_TYPE_MISMATCH` violations to valid**. Six published exams sit in AB11-101 (BCA-101, BCADS-301, BCADS-303, BCADS-501, BCADS-502, BCADS-503). |
| Decision | **Not applied.** The intended configuration is established, but whether the LAB edit was intentional cannot be proven, and the change alters what students see. The validator was not weakened and the test expectation was not edited. |

To apply (writes a backup first; reversible):

```bash
npx tsx --conditions=react-server scripts/room-type-correction.ts AB11-101 THEORY --apply
# revert:
npx tsx --conditions=react-server scripts/room-type-correction.ts --revert server/scheduling/.backups/<file>.json
```

## Pipeline consistency (source data to student timetable)

Canonical tables → loader (PostgREST) → `normalizeDataset` → conflict graph → algorithm → invigilation → independent validator → persisted run (`scheduling_runs`, `scheduled_exams`) → publication gate (re-validates against today's data) → `published_schedules` → `/api/v1/timetable/student` → web `/student` and the mobile app. All of these use the same exam, slot and room ids. Data drift is detected (the AB11-101 change shows up as live-validation failures of v5). Sandbox candidates never enter `scheduling_runs`. Publishing keeps history (new version, older retired; integration-tested earlier; no live publish was run in this phase).

## Feature status

| Feature | Status |
|---|---|
| Build, type and lint blockers | IMPLEMENTED AND VERIFIED |
| Engine reuse; traces on the three real algorithms | IMPLEMENTED AND VERIFIED |
| Guided, explained Judge Demo (8 steps) | IMPLEMENTED AND VERIFIED (browser) |
| Scenarios A–H with corrections and revalidation | IMPLEMENTED AND VERIFIED |
| CSV templates, validation, persisted import, verified read-back, exports | IMPLEMENTED AND VERIFIED |
| Students CSV import across two tables | PARTIAL: compensated, not a database transaction (no DDL path to install an RPC) |
| Mobile app on the shared API with Clerk auth | IMPLEMENTED AND VERIFIED (tests and live HTTP) |
| Debug APK | IMPLEMENTED AND VERIFIED (built and checksummed) |
| APK running on a device or emulator | IMPLEMENTED, NOT VERIFIED |
| Release APK | BLOCKED: no release signing configuration |
| Real-time sync between web and mobile | NOT IMPLEMENTED: refresh-based, documented |
| AB11-101 correction | BLOCKED on owner decision: script prepared, consequences measured |
| Audit trail for data edits and imports | PARTIAL: the import logs counts, but `auditService` writes via Prisma, which is not connected (pre-existing) |
| Student link registry durability | PARTIAL: JSON file on the server's disk (pre-existing); Clerk metadata is durable |

## Other fixes made during verification

- `ExportMenu` crashed when opened (Base UI `MenuGroupContext is missing`; pre-existing). Fixed.
- `createSubject` sent `unavailable_slots: []` (an array) into a TEXT column (pre-existing). Now `""`.
- Subjects table showed "Available"/"Inactive" for the laboratory requirement (pre-existing). Now "Required"/"Not required".
- Tablet-width horizontal overflow in the admin header and top bar.
- `querySupabase` gained an optional `prefer` list (backward compatible) for PostgREST upserts.
- An instant loading skeleton for admin navigation (`app/(admin)/admin/loading.tsx`).

## Outstanding

1. Decide on AB11-101 (command above). After applying it, the live integration suite should pass 6/6.
2. Launch the APK on an emulator or phone (create an AVD in Android Studio; see the mobile audit for commands).
3. Release signing, if a release APK is wanted.
4. Optional: a Supabase RPC for atomic students import; a durable table for the student link registry; connecting the audit log to the canonical database.
5. Nothing is committed in either repository.
