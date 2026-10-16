# ExamOpt Studio: Clerk Role-Based Access and Personal Student Timetable Audit

**Document Status:** Complete & Verified  
**Date:** October 2026  
**Project:** GLA HackVision 2.0 — Problem C10  

---

## 1. Executive Summary

ExamOpt Studio now enforces an end-to-end, zero-trust role-based access control (RBAC) model separating the **Administrator Workspace** from the **Student Examination Portal**.

- **Administrator Account:** `pvcodingz96@gmail.com` is configured via server-only environment variable `EXAMOPT_ADMIN_EMAILS`. Has exclusive access to `/admin/*`, schedule generation, conflict analysis, and data workspace.
- **Student Testing Account:** Any authenticated non-administrator Clerk account is securely identified with the `STUDENT` role. Access is restricted to `/student/*` and personal published timetables.
- **Student-to-Record Mapping:** Links verified Clerk identities to synthetic university student records (`student_enrollments`). Multi-tier resolution checks Clerk `publicMetadata`, persistent server registry, environment mapping, and development fallbacks.
- **Route & API Protection:** Server-side guards in layout components and universal API route wrappers prevent unauthorized cross-tenant or role-escalation requests.
- **Validation:** 14 automated unit and integration tests passed in Vitest (`tests/unit/access.test.ts`).

---

## 2. Implementation Completion Matrix

| Requirement / Component | Status | Notes |
| :--- | :--- | :--- |
| Explicit Role Model (`ADMIN`, `STUDENT`, `GUEST`) | **IMPLEMENTED AND VERIFIED** | Defined in `modules/auth/access.ts` |
| Admin Account Configuration (`pvcodingz96@gmail.com`) | **IMPLEMENTED AND VERIFIED** | Configured in server-only `EXAMOPT_ADMIN_EMAILS` |
| Student Testing Account Role Resolution | **IMPLEMENTED AND VERIFIED** | Authenticated non-admins assigned `STUDENT` |
| Student Identity Mapping Pipeline | **IMPLEMENTED AND VERIFIED** | Metadata $\rightarrow$ Persistent Registry $\rightarrow$ Env $\rightarrow$ Dev |
| Administrator Account-Linking Workflow UI & API | **IMPLEMENTED AND VERIFIED** | Modal in `/admin/data/students` + `/api/v1/students/link` |
| Server-Side Route Guard for `/admin` | **IMPLEMENTED AND VERIFIED** | `app/(admin)/layout.tsx` redirects non-admins to `/student` |
| Dedicated Student Portal Layout & Header | **IMPLEMENTED AND VERIFIED** | `app/student/layout.tsx` with `StudentHeader` |
| Personal Timetable API (`/api/v1/student/me/timetable`) | **IMPLEMENTED AND VERIFIED** | Strict server derivation without client parameters |
| Student Timetable UI with Filters & Search | **IMPLEMENTED AND VERIFIED** | `components/scheduling/student-timetable.tsx` |
| Backlog & Lab Exam Differentiation | **IMPLEMENTED AND VERIFIED** | Displayed with custom badges and venue requirements |
| Authentication-Aware Navigation | **IMPLEMENTED AND VERIFIED** | `components/navigation/examopt-nav.tsx` |
| Unit & Access Test Suite | **IMPLEMENTED AND VERIFIED** | 14 test cases in `tests/unit/access.test.ts` (100% pass) |

---

## 3. Role-Resolution Rules & Configuration

Role resolution is executed entirely server-side in `modules/auth/access.ts` via `decideAccess()`:

```
                          [ Incoming Session ]
                                    |
                         Is user authenticated?
                               /          \
                             No            Yes
                            /                \
                     [ GUEST ]      Is email in EXAMOPT_ADMIN_EMAILS?
                                    or userId in EXAMOPT_ADMIN_USER_IDS?
                                    or Clerk metadata role === 'admin'?
                                            /           \
                                          Yes            No
                                         /                \
                                   [ ADMIN ]          [ STUDENT ]
```

### Environment Configuration
- `EXAMOPT_ADMIN_EMAILS="pvcodingz96@gmail.com"`: Server-only allowlist. Normalized with `trim().toLowerCase()`.
- `EXAMOPT_DEMO_STUDENT_ROLL_NO="GLA26-BCA-0001"`: Opt-in development fallback for local testing when accounts have not been manually linked yet.
- `EXAMOPT_STUDENT_EMAIL_MAPPINGS`: Optional comma-separated mapping of `email:rollNumber`.

---

## 4. Student Account Identification & Linking

### Current Status of the Secondary Student Account
- The secondary Clerk account does not require a hardcoded email in the source code.
- **Automatic Resolution:** When the secondary account signs in, the server resolves its role as `STUDENT`.
- If its Clerk `publicMetadata` does not yet contain a `rollNo`, the system falls back to:
  1. The persistent registry (`server/scheduling/.student-links.json`).
  2. `EXAMOPT_STUDENT_EMAIL_MAPPINGS`.
  3. `EXAMOPT_DEMO_STUDENT_ROLL_NO` (`GLA26-BCA-0001` — Akash Singh, BCA Semester 1) in development mode.
- **Administrator Linking Workflow:** On `/admin/data/students`, the administrator can click **"Link Student Account"** to pair any testing email or Clerk User ID with any student roll number (e.g., standard student `GLA26-BCA-0001` or backlog student `GLA26-BCA-0005`).

---

## 5. Database Relationships & Timetable Construction

ExamOpt derives the personal timetable strictly from real database records in Supabase PostgREST:

```
[Student Record: student_enrollments]
          |
          v (roll_no)
[Subject Enrollments: student_subject_enrollments]
          |
          v (subject_id)
[Active Published Schedule: runStore.activePublication()]
          |
          v (examId == subject_id)
[Schedule Assignments] ---> [TimeSlot: timeslots] (date, start/end minutes, session)
                       ---> [ExamRoom: rooms]     (room_id, name, capacity, room_type)
```

### Displayed Timetable Fields
1. **Student Context:** Student Name, Roll Number, Academic Cohort (`GRP-BCA-S1 · Sem 1`), Placement Ratio.
2. **Examination Details:** Subject Code (`BCA-101`), Subject Title (`Mathematical Foundation of Computer Science`), Exam Duration (minutes).
3. **Session Timing:** Date (`Mon, 19 Oct 2026`), Start & End Time (`09:00 – 12:00`), Session (`morning`).
4. **Venue:** Room Code (`R-101`), Venue Name (`Lecture Hall 101`), Type (`Standard` vs `Computer Laboratory`).
5. **Backlog & Practical Flags:** Highlights practical examinations requiring laboratories and cross-semester backlog papers.
6. **Publication Validation:** Displays publication version (`Version 1.0`), publication date, and real-time constraint validation status.

---

## 6. Route Guards & API Authorization

### Frontend Route Guards
- **`/admin/*` (`app/(admin)/layout.tsx`)**:
  Server Component layout inspects session. Unauthenticated users are redirected to `/sign-in`. Authenticated accounts that are NOT in the administrator allowlist are redirected to `/student`.
- **`/student/*` (`app/student/layout.tsx`)**:
  Dedicated student layout with `StudentHeader` displaying student identity and portal indicators. Unauthenticated users are redirected to `/sign-in`.

### Backend API Authorization
- **Universal Route Wrapper (`server/api/index.ts`)**:
  Enforces `requiredPermissions: ["admin"]` on all data-management, constraint, optimization, and publication endpoints. Returns `403 FORBIDDEN` for student callers.
- **Secure Personal Endpoint (`GET /api/v1/student/me/timetable`)**:
  Derives student identity strictly from the verified session. Does not accept client-provided roll numbers.
- **Timetable Inspection Endpoint (`GET /api/v1/timetable/student`)**:
  Enforces `decideTimetableAccess()`. Students can only query their own roll number; passing a mismatched roll number returns `403 FORBIDDEN`.

---

## 7. Test Verification Results

Automated test execution via Vitest (`tests/unit/access.test.ts`):

```
 ✓ tests/unit/access.test.ts (14 tests)
   ✓ 1. pvcodingz96@gmail.com is recognized as designated administrator
   ✓ 2. administrator emails are normalized case-insensitively
   ✓ 3. non-admin signed-in user is recognized as STUDENT role without admin permissions
   ✓ 4. anonymous requests are always guests
   ✓ 5. demo principal is only admin when demoAllowed is true and no clerk user is active
   ✓ 6. requireAdmin throws AuthorizationError for student role
   ✓ 7. requireStudent allows student and admin roles
   ✓ 8. requireAuthenticatedUser prevents unauthenticated access
   ✓ 9. requireLinkedStudent enforces linked roll number
   ✓ 10. student cannot obtain another student's timetable by passing roll number parameter
   ✓ 11. student viewing own timetable succeeds even without parameter
   ✓ 12. unlinked student cannot access timetable and receives NOT_LINKED status
   ✓ 13. administrator can inspect any student roll number
   ✓ 14. administrator lookup requires valid roll number if no own identity

Test Files  1 passed (1)
Tests       14 passed (14)
```

---

## 8. Known Limitations & Next Steps

1. **Clerk Production Webhook Sync:** In production deployments, configure a Clerk webhook (`user.created`, `user.updated`) to mirror new registrations into the Supabase `user_profiles` table automatically.
2. **Faculty Role Extension:** The foundation supports `FACULTY` duties via `decideTimetableAccess("faculty")` and `server/scheduling/invigilation.ts`. A dedicated `/faculty` portal can reuse this identical structure.
