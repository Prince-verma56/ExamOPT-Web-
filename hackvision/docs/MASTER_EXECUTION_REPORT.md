# ExamOpt — End-to-End Supabase Cloud Setup & Execution Report

**Execution Timestamp:** 2026-10-16 13:42 UTC  
**Environment:** Windows (PowerShell)  
**Database Backend:** Supabase Cloud (`https://tvyiqyngqehrxrcxqwei.supabase.co`)  
**Overall Status:** **VERIFIED & OPERATIONAL (100% PASS)**

---

## 1. Live Supabase Connectivity

- **Cloud Endpoint:** `https://tvyiqyngqehrxrcxqwei.supabase.co`
- **Authentication:** Dual-key architecture configured locally in `.env`:
  - `SUPABASE_PUBLISHABLE_KEY`: Used for client operations and anonymous timetable lookups.
  - `SUPABASE_SECRET_KEY`: Used exclusively by backend services via server-side HTTP headers (`apikey` and `Authorization: Bearer <secret>`). Never exposed to client or committed to Git (`.gitignore` verified).
- **Health Check (`GET /health`):**
  ```json
  {
    "status": "healthy",
    "application": {
      "status": "UP",
      "service": "ExamOpt API",
      "version": "1.0.0"
    },
    "database": {
      "configured_backend": "supabase",
      "is_cloud": true,
      "connected": true,
      "status": "UP",
      "supabase_cloud_configured": true,
      "backend_details": {
        "backend": "supabase",
        "is_cloud": true,
        "connected": true,
        "url": "https://tvyiqyngqehrxrcxqwei.supabase.co",
        "auth_configured": true
      }
    }
  }
  ```
- **Fallback Guard:** Strict fail-fast enforcement in `DatabaseConfig` and `SupabaseRepository`. Preset switching and local SQLite reseeding are disabled when `DATABASE_BACKEND=supabase` to prevent silent SQLite fallbacks.

---

## 2. Database Tables and Record Counts (Live Cloud)

Live counts directly inspected from Supabase PostgREST REST API:

| Table Name | Cloud Row Count | Description / Scope |
| :--- | :--- | :--- |
| `rooms` | **15** | CSED Block AB-XI (Theory: 1,040 seats, Labs: 440 seats) |
| `timeslots` | **10** | 5 days × 2 sessions (Morning: 09:30–12:30, Evening: 02:00–05:00) |
| `faculty` | **20** | CSED Professors & Assistant Professors with duty caps & blackout slots |
| `subjects` | **24** | BCA, BCA-DS, MCA curricula across Semesters 1, 3, 5 |
| `student_groups` | **8** | Academic cohort sections |
| `student_enrollments` | **355** | Primary student roll records |
| `student_subject_enrollments`| **1,735** | Course registrations including 70 backlog students |
| `scheduling_runs` | **5** | Persisted optimization runs across algorithms |
| `scheduled_exams` | **120** | Schedule allocations (24 exams per saved run) |
| `published_schedules` | **2** | Official publications (`PUB-V2-ec7c4c` currently active) |
| `schedule_conflicts` | **0** | Conflict log (0 hard conflicts generated) |
| `user_profiles` | **0** | User role profiles linked to Supabase `auth.users` |

---

## 3. Migration Compatibility

- **Baseline Migration:** `supabase/migrations/20261016000001_initial_schema.sql` establishes core schema, foreign keys, and RLS baselines.
- **Forward Migration:** `supabase/migrations/20261016000002_tighten_faculty_rls_and_provisioning.sql`:
  - **Index Addition:** `idx_pg_published_schedules_run` on `published_schedules(run_id)` for high-performance active lookup.
  - **Faculty RLS Hardening:** Scopes faculty row-level access so faculty can view only their own records (`faculty_id = public.get_current_faculty_id() OR public.is_admin()`).
  - **Automatic Provisioning:** Creates trigger `on_auth_user_created` to automatically populate `public.user_profiles` upon `auth.users` registration with fixed `search_path = public`.
  - **Data Safety:** All operations use `CREATE INDEX IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION`. 100% non-destructive and backward compatible with existing cloud data.

---

## 4. Dataset Seeding & Integrity Validation

Verified via `DataQualityValidator`:
- **Data Quality Score:** **100 / 100**
- **Hard Errors:** **0**
- **Warnings:** **0**
- **Integrity Checks:**
  - Zero orphan student registrations (all reference valid `subjects` and `student_groups`).
  - Zero missing room capabilities (all lab courses matched to lab rooms).
  - All 70 backlog registrations verified against prerequisite subject graphs.

---

## 5. Timetable Generation & Hard-Constraint Validation

All 3 optimization algorithms executed live against cloud data:

| Algorithm | Scheduled | Hard Conflicts | Execution Time | Utilization | Soft Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **First-Fit Heuristic** | **24 / 24 (100%)** | **0** | 0.33 ms | 86.75% | 76.70 |
| **Welsh–Powell (Graph Coloring)** | **24 / 24 (100%)** | **0** | 0.64 ms | 87.63% | 77.05 |
| **MRV Backtracking (Constraint Satisfaction)** | **24 / 24 (100%)** | **0** | 0.21 ms | 87.19% | 76.88 |

### Hard Constraints Audit:
- **Student Clashes:** **0** (No student has more than one exam in the same time slot).
- **Backlog Clashes:** **0** (Backlog students have zero overlapping exams with their regular semester exams).
- **Room Capacity Violations:** **0** (Student headcount strictly within room capacity).
- **Lab Room Violations:** **0** (All practical courses allocated exclusively to CSED labs `AB11-LAB1` through `AB11-LAB5`).
- **Faculty Availability Violations:** **0** (Zero invigilation duties scheduled during faculty blackout slots).
- **Faculty Max Duty Caps:** **0** (All faculty duties within designated limits).
- **Fixed Exam Adherence:** **0** (Locked exam slots preserved exactly).

---

## 6. Authentication, RBAC, and Cloud Publication

Verified via live FastAPI server (`task-937` on `http://127.0.0.1:8000`):

1. **Public Endpoints:**
   - `GET /health` -> 200 OK (Application UP, Supabase UP).
   - `GET /api/v1/schedules/active-published` -> 200 OK (Returns active timetable `PUB-V2-ec7c4c` with 24 allocations).
2. **Unauthenticated Rejection:**
   - `GET /api/data/summary` without credentials -> **401 Unauthorized**.
3. **Student Privacy & Isolation:**
   - Student `GLA26-BCA-0001` querying own timetable -> **200 OK** (4 enrolled exams returned).
   - Student `GLA26-BCA-0001` querying `GLA26-BCA-0002` -> **403 Forbidden**.
4. **Faculty Duty Privacy & Isolation:**
   - Faculty `FAC-101` querying own invigilation duties -> **200 OK** (2 duties returned).
   - Faculty `FAC-101` querying `FAC-102` -> **403 Forbidden**.
5. **Administrative Workflows:**
   - Schedule generation (`POST /api/v1/schedules/generate`) -> 200 OK.
   - Schedule comparison (`POST /api/v1/schedules/compare`) -> 200 OK.
   - Schedule publishing (`POST /api/v1/schedules/{run_id}/publish`) -> 200 OK (Publishes Version 2).
   - CSV Export (`GET /api/v1/timetable/export/csv`) -> 200 OK (`text/csv`).

---

## 7. Test Suite & Frontend Build

- **Backend Pytest Suite:**
  - Command: `python -m pytest backend/tests`
  - Result: **32 passed, 0 failed in 0.54s**
  - Coverage: Algorithm correctness, API security, RBAC isolation, data validator, database adapters, and Supabase security policies.
- **Frontend Production Build:**
  - Command: `npm run build` (in `frontend/`)
  - Result: **Successfully built in 409ms**, 0 errors.
  - Assets generated: `dist/index.html` (0.84 kB), `dist/assets/index-DHf3wcrq.css` (19.48 kB), `dist/assets/index-Dso3owvV.js` (266.95 kB).

---

## 8. Blockers & Defect Resolutions

- **No Active Blockers.**
- All cloud endpoints, security boundaries, and scheduling pipelines are fully verified and live.
