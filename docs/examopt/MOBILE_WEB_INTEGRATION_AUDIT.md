# Mobile and web integration — audit

Date: 2026-10-17.

## Where the mobile app lives

- Path: `hackvision/examopt_mobile/` (Flutter). It is inside the nested `hackvision` Git repository (`prakhyat798/ExamOpt`, branch `main`) and **untracked there** (`?? examopt_mobile/`), so it has no history.
- Before changing anything, the original `lib/`, `test/`, `pubspec.*`, `analysis_options.yaml` and `android/app/` were copied to the session scratchpad: `…/scratchpad/examopt_mobile_backup/`. Nothing else in `hackvision/` was touched; its other uncommitted changes (backend, frontend, docs) are not ours and were left alone.

## What was wrong (as found)

- It called the **reference FastAPI backend** (`:8000`, `/api/v1/auth/login`), not the ExamOpt Next.js API.
- Base URL hard-coded to `http://10.0.2.2:8000` / `127.0.0.1`.
- On any network failure it **substituted hard-coded data**: a fake student profile ("Akash Singh"), fake exams, fake faculty duties, fake seating plans and rooms. The models used a hard-coded "today" (16 Oct 2026). Several buttons claimed actions that did not happen ("Added to Google Calendar", "Reminder set").
- The student timetable request sent `?roll_no=` from the device: identity by request parameter.
- The login screen was prefilled with demo credentials; the app started by auto-logging in.
- `android:usesCleartextTraffic="true"` for all builds; the release build type was signed with the debug key.
- Its widget tests asserted the fake data itself (for example "Akash Singh", "2 Days Left"), so they tested the fallbacks, not the app.

## What it is now

| Area | Implementation | Status |
|---|---|---|
| Backend | Only the ExamOpt Next.js API v1, the same routes and Supabase-backed services the web uses: `GET /api/v1/access`, `GET /api/v1/timetable/student`, `GET /api/v1/timetable/faculty`. No new endpoints were needed. No database credentials or Supabase keys in the app. | IMPLEMENTED AND VERIFIED (live) |
| Authentication | Clerk, the same instance as the web. `lib/core/clerk_auth.dart` uses Clerk's Frontend API in native mode (`_is_native=1`): email + password, then **the emailed-code step Clerk requires on a new device** (`needs_client_trust`, or an email second factor). The session JWT (about 60 s) is refreshed before expiry and sent as `Authorization: Bearer`. Only the publishable key is in the app. | IMPLEMENTED AND VERIFIED (live) |
| Identity and ownership | The server derives the role and the linked roll number or faculty id from the verified token (Clerk `publicMetadata`, the link registry, or the env mapping). The app never sends a roll number or role. Unlinked accounts see an explanation; administrators are told to use the web workspace. | IMPLEMENTED AND VERIFIED (live) |
| Screens | Sign-in (with code step), Home (next exam, counts, subjects missing from the publication, overlap and "data changed since publishing" warnings), Timetable (upcoming / completed / all, grouped by date), Exam details, Duties (linked faculty), Profile (what the server says, server URL, sign out). Loading, empty, error, retry, not-linked and session-expired states. | IMPLEMENTED AND VERIFIED (widget tests) |
| Retired showcase screens | Seating plan, search filters, conflict alert, notifications feed, calendar, design drawer, device frame, faculty home: they rendered fabricated data and have no backend. They remain in the backup. | Documented |
| Configuration | `--dart-define=API_BASE_URL=…` and `--dart-define=CLERK_PUBLISHABLE_KEY=…`. Debug default `http://10.0.2.2:3000` (the emulator's alias for the development machine). Release builds require an `https://` URL; otherwise the app shows a configuration message instead of failing silently. | IMPLEMENTED AND VERIFIED (unit) |
| Android network policy | Main manifest `usesCleartextTraffic="false"`; `src/debug/AndroidManifest.xml` enables cleartext for debug builds only (emulator or LAN dev server). App label "ExamOpt". | IMPLEMENTED (debug build verified) |
| Refresh | Data loads at sign-in and on pull-to-refresh or Retry. **No real-time sync.** A change saved on the web (for example a new publication) appears on the phone at the next refresh. | IMPLEMENTED AND VERIFIED (widget tests) |
| Session persistence | In memory only (no secure-storage package was added). After an app restart the user signs in again. | Known limitation |
| `pubspec.yaml` | Dart SDK constraint relaxed from `^3.13.4` to `^3.13.0`. The installed Flutter 3.47.1 bundles Dart 3.13.1 and could not resolve packages at all; nothing in the code needs 3.13.4. Description updated. | Changed |

## Shared API contract used by the app

| Endpoint | Auth | Returns |
|---|---|---|
| `GET /api/v1/access` | Bearer session | `{ userId, email, role, permissions, identity: { rollNo, facultyId }, isLinked }` |
| `GET /api/v1/timetable/student` | Bearer; students get only their own record (a `rollNo` query parameter for anyone else is 403) | `{ student, publication, status, valid, exams[], notInPublishedSchedule[], clashes[] }` from the **active publication**, revalidated against current data |
| `GET /api/v1/timetable/faculty` | Bearer; own record only | `{ faculty, publication, status, duties[], maxDuties }` |

All responses use the web's `{ success, data | error: { code, message } }` envelope. The app maps 401 to "sign in again", 403 `NOT_LINKED` to the linking explanation, network errors and timeouts to retry states.

## Verification

| Check | Command | Result |
|---|---|---|
| Format | Flutter SDK's `dart format --output=none --set-exit-if-changed lib test` | clean |
| Analyze | `flutter analyze` | **No issues found** |
| Tests | `flutter test` | **13/13 pass**: configuration decoding; missing-config message; sign-in → own exams with a Bearer token and **no roll number in the request**; timetable grouping and filters; exam details; wrong password; not linked; not published; server error then retry; 401 returns to sign-in; faculty duties tab; "changed since publishing" warning; 320×568 phone without overflow; new-device emailed code (wrong code refused, right code completes) |
| Live check against the dev server and the real Clerk instance | `dart run tool/verify_live.dart …` (uses the app's own `lib/core`) with a temporary Clerk test user linked to `GLA26-BCA-0001`, deleted afterwards (0 remaining) | Wrong password refused (`form_password_incorrect`); Clerk demanded the new-device code and the app handled it; wrong code refused (`form_code_incorrect`); sign-in completed; `/access` resolved `GLA26-BCA-0001` from the token; `/timetable/student` returned that student's 4 published exams (version 5), all among their enrollments; another student's timetable **403**; Demo Studio and CSV export **403**; sign-out cleared the session |
| Anonymous access, production build | `next start` + curl | `/timetable/student`, `/timetable/faculty`, `/access`: **401**. (On the dev server, `FEATURE_DEMO_MODE=true` deliberately maps anonymous requests to a demo admin; development only.) |
| APK | `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=CLERK_PUBLISHABLE_KEY=<pk_test_…>` with `JAVA_HOME=C:/Users/VICTUS/.jdks/jbr-17.0.14` | **Built.** See below. |
| On-device launch | — | **Not run.** No Android emulator image exists (`flutter emulators`: none) and no device was attached. |

### APK

- Path: `hackvision/examopt_mobile/build/app/outputs/flutter-apk/app-debug.apk`
- Build type: **debug** (debug-signed; a release build is not produced because no release signing configuration exists, and the existing release block reuses the debug key)
- Version: `1.0.0+1` (pubspec)
- Size: 166,019,783 bytes (debug, all ABIs)
- SHA-256: `9dca272a097ef3bd2e1d024207feb80191441fe79300c8bb4e84cd078dcd0025`
- API base URL compiled in: `http://10.0.2.2:3000` (Android emulator → this machine's port 3000). For a physical phone, rebuild with the machine's LAN address. For production, use an HTTPS URL.
- **Toolchain note:** the default JDK on this machine is 26, whose `jlink` cannot process Android SDK 35's `core-for-system-modules.jar` (`:jni:compileDebugJavaWithJavac` fails). The build succeeds with JDK 17 via `JAVA_HOME` for that command only; no global setting was changed. Android SDK licences are reported as not accepted by `flutter doctor`; the debug build did not need them.

## Running web and mobile together

1. Web and API: `npm run dev` (port 3000) in the repository root. Both clients use this server and its Supabase project.
2. Link a student account: on `/admin/data/students`, "Link Student Account" (or set Clerk `publicMetadata.rollNo`).
3. Android emulator (create one in Android Studio's Device Manager), then from `hackvision/examopt_mobile`:
   `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=CLERK_PUBLISHABLE_KEY=<pk_test_…>`
   (on this machine, prefix with `JAVA_HOME=C:/Users/VICTUS/.jdks/jbr-17.0.14` for Gradle).
4. Physical phone on the same Wi-Fi: run the dev server reachable on the LAN (`npm run dev -- -H 0.0.0.0`) and use `API_BASE_URL=http://<your-LAN-IP>:3000` (debug builds only allow cleartext).
5. Production: deploy the web app over HTTPS and build with `API_BASE_URL=https://<host>` and the live `pk_live_…` key.

## Known limitations

- On-device launch not yet observed (no emulator image or device).
- The student link registry (`server/scheduling/.student-links.json`) lives on the server's disk; on serverless hosting it does not persist. Clerk `publicMetadata.rollNo` is the durable option.
- No push notifications or real-time updates; refresh is manual.
- Sessions are not persisted across app restarts.
