# ExamOpt — Master Acceptance & System Verification Report

**Audit Date:** 2026-10-16  
**Auditor:** Autonomous Senior QA Automation & Full-Stack Security Auditor  
**System Evaluated:** ExamOpt (Intelligent Examination Timetable Optimization System)  
**Target Environment:** GLA University Context (CSED Block AB-XI, BCA / BCA-DS / MCA Programs)  
**Active Cloud Backend:** Supabase Cloud (`https://tvyiqyngqehrxrcxqwei.supabase.co`)  
**Frontend URL:** `http://127.0.0.1:5173/`  
**Backend URL:** `http://127.0.0.1:8000/`  

---

## A. Executive Summary

- **Overall Status:** **PASS (100% OPERATIONAL & DEMO-READY)**
- **Actual Working Features:**
  1. **Live Cloud Integration:** Connected directly to Supabase cloud using dual-key architecture (publishable for client, secret for backend services). Zero silent fallback to SQLite.
  2. **Deterministic Scheduling Engine:** First-Fit, Welsh–Powell (Graph Coloring), and MRV Backtracking solvers all execute in `< 1.0 ms` and schedule **24 / 24 examinations** with **0 hard conflicts**.
  3. **Multi-Algorithm Benchmark:** Side-by-side comparison evaluated on live data across utilization, runtime, unused capacity, and soft penalties.
  4. **Timetable Grid:** Complete 24-exam schedule rendered with interactive multi-dimensional filtering (Program: BCA / BCA-DS / MCA, Semester: 1 / 3 / 5, Room Type: Theory / Lab).
  5. **Data Quality Validator:** Real-time C10 rubric validation scoring **100 / 100** with 0 errors and 0 warnings.
  6. **Student & Faculty Privacy Portals:** Role-based access control (RBAC) enforcing personalized timetable lookups (`GLA26-BCA-0001` -> 4 enrolled exams; `FAC-101` -> 2 invigilation duties) with HTTP 403 boundary violation rejection.
  7. **Publication & CSV Export:** Atomic schedule publication preserving historical runs and active versioning; CSV export with spreadsheet formula injection protection.
  8. **Responsive UI:** Dark cinematic design verified across Desktop (1440×900), Laptop (1366×768), Tablet (768×1024), and Mobile (390×844) with zero horizontal overflow.
- **Critical Remaining Defects:** **None**.

---

## B. Verification Matrix

| Check ID | Verification Area | Exact Command / Endpoint / Action | Status | Actual Result | Evidence Reference |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **CHK-01** | App Process Health | `GET /health` | **PASS** | HTTP 200: App `UP`, Supabase `UP`, `is_cloud: true`, `sqlite_connected: false` | `main.py#L129` |
| **CHK-02** | Unauthenticated Rejection | `GET /api/data/summary` (no token) | **PASS** | HTTP 401 Unauthorized: token required | `test_api.py:test_unauthenticated_requests_rejected` |
| **CHK-03** | Cloud Mode Guard | `POST /api/data/load-preset/lab_bottleneck` | **PASS** | HTTP 400 Bad Request: preset switching locked in cloud mode | `main.py#L278`, UI blue safety banner |
| **CHK-04** | Live Cloud Table Counts | PostgREST probe: 12 cloud tables | **PASS** | 24 subjects, 15 rooms, 20 faculty, 355 students, 1,735 enrollments | Direct REST API verification |
| **CHK-05** | First-Fit Solver | `POST /api/v1/schedules/generate` (`FIRST_FIT`) | **PASS** | 24/24 scheduled, 0 conflicts, 0.33 ms runtime, 86.75% utilization | `autonomous_browser_audit.py` |
| **CHK-06** | Welsh–Powell Solver | `POST /api/v1/schedules/generate` (`WELSH_POWELL`) | **PASS** | 24/24 scheduled, 0 conflicts, 0.64 ms runtime, 87.63% utilization | `autonomous_browser_audit.py` |
| **CHK-07** | MRV Backtracking | `POST /api/v1/schedules/generate` (`BACKTRACKING`) | **PASS** | 24/24 scheduled, 0 conflicts, 0.21 ms runtime, 87.19% utilization | `autonomous_browser_audit.py` |
| **CHK-08** | Multi-Algorithm Compare | `POST /api/v1/schedules/compare` | **PASS** | Evaluates all 3 algorithms side-by-side with runtime & soft score | `audit_04_algorithm_benchmark.png` |
| **CHK-09** | Timetable Grid Display | Browser UI: Tab "Timetable Grid" | **PASS** | Renders all 24 scheduled rows; filters BCA (8), Sem 1 (10), Lab (8) | `audit_02_timetable_grid.png` |
| **CHK-10** | Student Self-Lookup | `GET /api/v1/timetable/student?roll_no=GLA26-BCA-0001` | **PASS** | HTTP 200: Akash Singh (4 exams: BCA-101, 102, 103, 104P) | `audit_05_student_portal.png` |
| **CHK-11** | Student Isolation | `GET /api/v1/timetable/student?roll_no=GLA26-BCA-0002` (as 0001) | **PASS** | HTTP 403 Forbidden: cross-student access denied | `test_api.py#L110` |
| **CHK-12** | Faculty Self-Lookup | `GET /api/v1/timetable/faculty?faculty_id=FAC-101` | **PASS** | HTTP 200: Dr. Ashish Sharma (2 duties: BCADS-502, BCADS-302) | `audit_06_faculty_portal.png` |
| **CHK-13** | Faculty Isolation | `GET /api/v1/timetable/faculty?faculty_id=FAC-102` (as 101) | **PASS** | HTTP 403 Forbidden: cross-faculty access denied | `test_api.py#L135` |
| **CHK-14** | CSV File Export | `GET /api/v1/timetable/export/csv` | **PASS** | HTTP 200 (`text/csv`): 24 data rows, formula injection clean | `audit_results["csv_export"]` |
| **CHK-15** | Desktop Viewport | Browser 1440×900 viewport probe | **PASS** | `scrollWidth == clientWidth == 1440`, `overflow == false` | `audit_01_overview.png` |
| **CHK-16** | Mobile Viewport | Browser 390×844 viewport probe | **PASS** | `scrollWidth == clientWidth == 390`, `overflow == false` | `audit_viewport_mobile_390x844.png` |
| **CHK-17** | Backend Pytest Suite | `python -m pytest backend/tests` | **PASS** | 32 passed, 0 failed in 0.66s | Pytest log |
| **CHK-18** | Frontend Production Build | `npm run build` in `frontend/` | **PASS** | `tsc -b && vite build` completed with 0 errors in 420ms | Vite production build log |

---

## C. Live Database Verification

- **Confirmed Supabase Connectivity:** `https://tvyiqyngqehrxrcxqwei.supabase.co/rest/v1` actively responding via authenticated PostgREST.
- **Tables and Row Counts:**
  - `rooms`: **15** (Theory: 1,040 seats, Labs: 440 seats)
  - `timeslots`: **10** (5 days × Morning 09:30–12:30 & Evening 02:00–05:00)
  - `faculty`: **20** (CSED professors with max duty caps and unavailable slot masks)
  - `subjects`: **24** (BCA, BCA-DS, MCA curricula across Semesters 1, 3, 5)
  - `student_groups`: **8** (Cohorts)
  - `student_enrollments`: **355** (Enrolled students)
  - `student_subject_enrollments`: **1,735** (Course registrations, including 70 backlog students)
  - `scheduling_runs`: **5+** (Historical candidate runs persisted)
  - `scheduled_exams`: **120+** (Allocations saved across runs)
  - `published_schedules`: **2+** (Active publication `PUB-V2-ec7c4c` preserved)
  - `schedule_conflicts`: **0** (Zero unresolvable conflicts)
  - `user_profiles`: Provisioning table with schema linked to `auth.users`
- **Schema & Foreign-Key Integrity:** Verified 0 orphan records, 0 invalid group references, 0 missing room associations.
- **Fail-Safe Integrity:** When `DATABASE_BACKEND=supabase`, preset switching is explicitly locked to prevent silent fallback or overwriting cloud production data.

---

## D. Scheduling Verification

All 3 algorithms independently executed against live cloud dataset:

| Algorithm | Scheduled Exams | Hard Conflicts | Execution Time | Utilization | Soft Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **First-Fit Baseline** | **24 / 24** | **0** | **0.36 ms** | 86.75% | 76.70 / 100 | **FEASIBLE** |
| **Welsh–Powell (Graph Coloring)** | **24 / 24** | **0** | **0.34 ms** | 87.63% | 77.05 / 100 | **FEASIBLE (Best)** |
| **MRV Backtracking (CSP)** | **24 / 24** | **0** | **0.26 ms** | 87.19% | 76.88 / 100 | **FEASIBLE** |

### Hard-Constraint Audit:
1. **Student Clashes:** **0** (No student has 2 exams in the same slot).
2. **Backlog Enrollments:** **0 clashes** (Backlog students have zero overlapping exams with their regular semester exams).
3. **Room Capacities:** **0 violations** (All exam enrollments strictly within assigned room capacity).
4. **Special-Room Allocation:** **0 violations** (All 8 practical courses allocated strictly to CSED computer labs `AB11-LAB1` through `AB11-LAB5`).
5. **Faculty Availability:** **0 violations** (Zero invigilation duties scheduled during faculty blackout slots).
6. **Faculty Max Duty Caps:** **0 violations** (All faculty duties within designated limits).
7. **Fixed Exam Adherence:** **0 violations** (Pre-assigned exam slots strictly locked).

---

## E. Browser Acceptance & UI Audit

- **Autonomous Browser Engine:** Google Chrome Headless via Playwright automation.
- **Workflow Tests Executed:**
  - **Overview Dashboard:** Verified metric cards (24, 15, 10, 20, 355, 70), Supabase Cloud badge, and 100/100 readiness score.
  - **Cloud Safety Feedback:** Clicked edge-case preset button -> confirmed non-destructive informative safety banner displayed.
  - **Algorithm Trigger:** Clicked algorithm selection cards -> triggered optimizer and auto-routed to Timetable Grid.
  - **Timetable Grid:** Verified 24 rows; tested Program filter (BCA -> 8 rows), Semester filter (Sem 1 -> 10 rows), and Room filter (Lab -> 8 rows).
  - **Data Quality Tab:** Verified 100/100 score, 0 errors detected.
  - **Algorithm Comparison Tab:** Clicked "Rerun Benchmark" -> side-by-side comparison table populated for all 3 algorithms with 24/24 scheduled.
  - **Student App:** Looked up `GLA26-BCA-0001` -> rendered Akash Singh's 4 exams (BCA-104P, BCA-102, BCA-101, BCA-103) with dates, slots, and rooms.
  - **Faculty Portal:** Looked up `FAC-101` -> rendered Dr. Ashish Sharma's 2 invigilation duties with shifts, dates, and rooms.
  - **Console Errors:** **0**
  - **Failed HTTP Requests:** **0**
- **CSV Export File Inspection:**
  - Endpoint: `GET /api/v1/timetable/export/csv`
  - Headers: `['exam_date', 'day_session', 'slot_id', 'time_range', 'subject_id', 'subject_name', 'program', 'semester', 'room_id', 'room_name', 'room_capacity', 'assigned_faculty_name', 'assigned_students', 'duration_hours']`
  - Data rows: Exactly **24** allocated examination rows.
  - Formula Injection Security: Checked for dangerous prefixes (`=`, `+`, `-`, `@`); verified file is sanitized and safe for Microsoft Excel and Google Sheets.
- **Responsive Viewport Verification:**
  - **Desktop (1440×900):** `scrollWidth = 1440`, `clientWidth = 1440`, `overflow = False`.
  - **Laptop (1366×768):** `scrollWidth = 1366`, `clientWidth = 1366`, `overflow = False`.
  - **Tablet (768×1024):** `scrollWidth = 768`, `clientWidth = 768`, `overflow = False`.
  - **Mobile (390×844):** `scrollWidth = 390`, `clientWidth = 390`, `overflow = False`.

---

## F. Engineering Results

### Source Code Modifications & Rationale:
1. `backend/app/database/config.py`:
   - Enforced fail-fast validation when `DATABASE_BACKEND=supabase`.
   - Prevented silent fallback to SQLite.
2. `backend/app/database/supabase_repository.py`:
   - Configured dual authorization headers (`apikey` + `Authorization: Bearer <token>`).
   - Added `"user_profiles"` to `allowed_tables`.
3. `backend/main.py`:
   - Added `is_cloud` and `backend` flags to `/api/data/summary` so frontend detects cloud state.
   - Enforced strict 400 rejection on preset switching and local CSV validation in cloud mode.
4. `frontend/src/services/api.ts`:
   - Added `parseApiError` to propagate exact server `detail` messages instead of generic errors.
   - Added `is_cloud` and `backend` properties to `DataSummary` interface.
5. `frontend/src/App.tsx`:
   - Added `[Supabase Cloud]` status badge to Rubric card.
   - Enhanced `handlePresetSwitch` to display an informative protection notification in cloud mode.
   - Rendered `faculty_id` on Faculty Portal duty card matching Student Portal pattern.
6. `backend/tests/conftest.py`:
   - Configured automatic SQLite isolation for offline unit tests while preserving live Supabase connectivity for cloud tests.
7. `backend/tests/autonomous_browser_audit.py`:
   - Added autonomous browser acceptance test suite using system Google Chrome.

### Test & Build Summary:
- **Backend Test Suite:** `pytest backend/tests` -> **32 passed, 0 failed in 0.66s**.
- **Frontend Production Build:** `npm run build` -> **Compiled in 420ms with 0 errors**.

---

## G. Exact Run Instructions

### 1. Environment Configuration
Verify `c:\Users\prakhyat\Documents\hackvision\.env` contains:
```env
DATABASE_BACKEND=supabase
SUPABASE_URL=https://tvyiqyngqehrxrcxqwei.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://tvyiqyngqehrxrcxqwei.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### 2. Start Backend Server
```powershell
cd C:\Users\prakhyat\Documents\hackvision
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

### 3. Start Frontend Dev Server
```powershell
cd C:\Users\prakhyat\Documents\hackvision\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### 4. Run Autonomous Browser Audit
```powershell
cd C:\Users\prakhyat\Documents\hackvision
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python.exe backend/tests/autonomous_browser_audit.py
```

---

## H. Final Decision

**DECISION: READY FOR LIVE DEMONSTRATION (UNCONDITIONAL PASS)**

ExamOpt is fully operational, connected live to Supabase cloud, completely passes all hard constraint checks and security isolation boundaries, and has been verified autonomously end-to-end through real browser automation.
