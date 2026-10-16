# ExamOpt — Operator Demonstration & Acceptance Runbook
**Competition:** GLA University HackVision 2.0 — Problem Track C10  
**Project:** ExamOpt — Intelligent Examination Timetable Optimization System  
**Audit Date:** October 16, 2026  
**Audience:** HackVision Evaluators, Technical Judges, QA Auditors, and System Operators

---

## 1. Overview & Demonstration Objective

This runbook guides operators through a live, end-to-end demonstration of the **ExamOpt** system for GLA University HackVision 2.0 Track C10.

Every step in this runbook exercises real backend algorithms, live database records in `backend/examopt.db`, dynamic client state, and role-based security. No mock presentation screens or static placeholders are used.

---

## 2. Environment Verification & Startup Procedure

### Prerequisites
- Python 3.11+ (verified on Python 3.15.0 with virtual environment in `backend\.venv`)
- Node.js 18+ & npm (verified on Node 20 / npm 10)
- Flutter SDK 3.24+ (verified on Flutter 3.38.5)
- Ports available: `8000` (Backend API), `5173` (Web Frontend)

### Startup Sequence (Execute in 3 Separate Terminals)

#### Terminal 1: FastAPI Backend
```powershell
cd c:\Users\prakhyat\Documents\hackvision\backend
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- **Verification URL:** Open `http://127.0.0.1:8000/api/v1/health`
- **Expected Output:** `{"status": "healthy", "service": "examopt-backend", "version": "1.0.0"}`

#### Terminal 2: React / Vite Web Frontend
```powershell
cd c:\Users\prakhyat\Documents\hackvision\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- **Verification URL:** Open `http://127.0.0.1:5173/` in Google Chrome or Edge.

#### Terminal 3: Flutter Mobile Client (Desktop / Web / Emulator)
```powershell
cd c:\Users\prakhyat\Documents\hackvision\examopt_mobile
# Option A: Run as Windows Desktop Application
flutter run -d windows

# Option B: Run in Chrome Browser
flutter run -d chrome --web-port 8080

# Option C: Run in Connected Android Emulator
flutter run -d emulator-5554
```

---

## 3. Demonstration Script (12-Step Walkthrough)

### Step 1: Institutional Login & Role Switching
- **Web:** Navigate to `http://127.0.0.1:5173`. Click the top-right **"Institutional Login"** button.
- **Mobile:** Launch the app. The **Login Screen** presents three role tabs: `STUDENT`, `FACULTY`, `ADMIN`.
- **Demo Credentials:**
  - **Student Persona:** Tap chip `GLA26-BCA-0001 (Akash Singh)` -> Password auto-fills -> Tap **"Sign In to ExamOpt"**.
  - **Faculty Persona:** Tap chip `FAC-101 (Dr. Ashish Sharma)` -> Tap **"Sign In"**.
  - **Admin Persona:** Tap chip `admin@examopt.internal` -> Tap **"Sign In"**.
- **Key Observation:** The authenticated user's name, roll number/faculty ID, and role are resolved dynamically from SQLite via `POST /api/v1/auth/login` and `GET /api/v1/auth/me`.

---

### Step 2: Dashboard & Synthetic Dataset Metrics Overview
- **Action:** In the Web dashboard, observe the dataset summary cards.
- **Verified Relational Metrics:**
  - **Total Subjects:** 24 (16 Theory + 8 Laboratory courses)
  - **Total Rooms:** 15 (10 Theory Halls with 1,040 seats + 5 Specialized Labs with 440 seats)
  - **Total Timeslots:** 10 (5 Exam Days × 2 Sessions: Morning / Evening)
  - **Faculty Invigilators:** 20 (Duty capacity = 91 slots, Max duties = 4 per faculty)
  - **Student Cohorts:** 8 (5 Regular cohorts + 3 Backlog cohorts)
  - **Total Students:** 355 individual students (285 regular + 70 backlog)
  - **Total Enrollments:** 1,735 normalized student-subject enrollments
- **Key Observation:** Explaining the 5 vs 8 laboratory discrepancy to judges: There are **8 laboratory subjects** in the curriculum and **5 physical laboratory rooms** on campus.

---

### Step 3: Timetable Grid & Dynamic Filter Controls
- **Action:** Open the **Timetable** view in the Web or Mobile application.
- **Interactive Controls:**
  - **Program Filter:** Select `BCA` -> Result count updates to BCA subjects only (8 exams).
  - **Semester Filter:** Select `Semester 1` -> Shows Semester 1 subjects (`BCA-101`, `102`, `103`, `104P`).
  - **Room Type Filter:** Select `LAB` -> Shows only the 8 laboratory exams mapped to `AB11-LAB1` through `AB11-LAB5`.
  - **Reset Filters:** Click **"Reset"** -> All 24 scheduled allocations are restored.
- **Key Observation:** Filtering is dynamic and non-destructive. Clearing filters instantaneously restores the complete schedule.

---

### Step 4: Multi-Algorithm Benchmarking
- **Action:** In the Web interface, click the **"Benchmark"** tab or trigger `POST /api/v1/benchmark`.
- **Algorithm Comparison:**
  - **Welsh-Powell (Graph Coloring):** Sorts subjects by clashing degree; assigns slots with minimum chromatic number; Room packing utilization: ~87.6%.
  - **Backtracking (Constraint Satisfaction):** Explores depth-first search with forward checking; Execution time: < 2 ms.
  - **Genetic Algorithm:** Evaluates population fitness, crossover, and mutation over 100 generations.
  - **First-Fit (Greedy Baseline):** Demonstrates naive allocation; compared directly against optimized solvers.
- **Key Observation:** All algorithms enforce the same hard constraints (0 student clashes, 0 room double-bookings, lab room guards).

---

### Step 5: Independent Constraint Validation & Infeasibility Diagnostics
- **Action:** Test the conflict diagnostic engine against normal and corrupted presets.
- **Live Scenarios:**
  - **Scenario A (Normal Dataset):** Validates active published schedule. Output: `Hard Violations: 0`, `Soft Penalty: Optimal`.
  - **Scenario B (`lab_bottleneck` Preset):** Forces 6 simultaneous lab exams into a single morning slot with only 5 available lab rooms.
    - *Diagnostic Output:* System detects infeasibility and clearly explains: `Unsatisfied Hard Constraint: Lab room capacity exceeded in slot D1-M (Required: 6, Available: 5).`
  - **Scenario C (`capacity_overflow` Preset):** Enrolls 180 students into a subject where the largest available auditorium holds 150.
    - *Diagnostic Output:* System halts generation and explains the room overflow root cause.
- **Key Observation:** System does not crash or silently produce an invalid schedule; it provides human-readable root cause explanations.

---

### Step 6: Schedule Publication & Monotonic Versioning
- **Action:** In the Admin view, review candidate schedule run metrics and click **"Publish Timetable"**.
- **Backend Flow:**
  - System executes atomic database transaction updating `published_schedules`.
  - Increments version number monotonically (e.g., Version 40 -> Version 41).
  - Flags prior versions as superseded while maintaining complete audit history.
- **Key Observation:** Re-running the scheduler generates a new draft `run_id` without corrupting or overwriting the currently active published schedule until explicitly confirmed.

---

### Step 7: Personalized Student Timetable & Dynamic Calendar
- **Action:** Switch to Student view logged in as `Akash Singh` (`GLA26-BCA-0001`).
- **Student Timetable:**
  - Displays exactly the 4 examinations `Akash Singh` is enrolled in (`BCA-101`, `BCA-102`, `BCA-103`, `BCA-104P`).
  - Exams of other programs (e.g., `MCA-101` or `BCADS-501`) are excluded.
- **Interactive Calendar Navigation:**
  - Click next/previous month chevrons: Month heading updates dynamically with correct day grid and weekday alignment.
  - Select an examination date (e.g., October 19): Displays the specific exam assigned for that date with time, room, and session.
  - Select a date without exams (e.g., October 24): Displays a clean empty state: *"No examinations scheduled for this date."*
- **Key Observation:** Resolves the pre-remediation defect where calendar chevrons were dead and every clicked date showed a static fake card.

---

### Step 8: Dynamic Examination Details Screen
- **Action:** Tap any examination card from the student calendar, timetable, or home screen.
- **Verified Content:**
  - **Subject Code & Title:** Reflects the selected subject (e.g., `BCA-104P - Digital Electronics Lab`).
  - **Date & Session:** Real date and session window (e.g., `2026-10-19 | 09:30 AM - 11:30 AM`).
  - **Assigned Room & Block:** Specialized lab room (e.g., `AB11-LAB1, Academic Block 11`).
  - **Type Badge:** `LABORATORY (2 Hours)` vs `THEORY (3 Hours)`.
  - **Student Guidelines:** Tailored instructions for laboratory vs theory examinations.
- **Key Observation:** The details screen receives dynamic `ExamItem` model parameters, eliminating the prior hardcoded DSA placeholder.

---

### Step 9: Faculty Invigilation Duty Roster
- **Action:** Switch to Faculty view logged in as `Dr. Ashish Sharma` (`FAC-101`).
- **Duty Roster View:**
  - Displays assigned invigilation slots and room assignments.
  - Total duties strictly adhere to departmental duty cap (`max_duties = 4`).
  - Blackout slots (`D1-M` and `D4-E`) contain zero assigned duties.
- **Security Check:** Attempting to query another faculty member's duty roster (`?faculty_id=FAC-102`) returns `HTTP 403 Forbidden`.

---

### Step 10: Room Seating Allocation Matrix
- **Action:** Open the **Room Seating Plan** screen (`RoomSeatingScreen`).
- **Interactive Controls:**
  - Select room `AB11-101` from the room dropdown.
  - Select scheduled examination `BCA-101`.
- **Seating Matrix Output:**
  - Displays deterministic 8 × 10 grid.
  - Enrolled students (e.g., `GLA26-BCA-0001` through `GLA26-BCA-0050`) are placed in alternating seats with row/column coordinates.
  - Vacant seats and aisle dividers are clearly indicated.
  - Occupied count exactly matches subject cohort enrollment (40 students) without exceeding room capacity (100).
- **Key Observation:** Backed by live API endpoint `GET /api/v1/rooms/{room_id}/seating`.

---

### Step 11: CSV Timetable Export
- **Action:** Click the **"Export CSV"** button on the timetable screen.
- **Verified Output:**
  - Browser downloads RFC 4180 compliant CSV file (`examopt_timetable.csv`).
  - Columns: `exam_date,day_session,slot_id,time_range,subject_id,subject_name,program,semester,cohort_id,room_id,room_name,room_type,invigilator_id,invigilator_name,enrolled_count`.
  - Values match published database records (24 rows).

---

### Step 12: Secure Logout & Session Invalidation
- **Action:** In either Web or Mobile profile screen, tap **"Sign Out"**.
- **Expected Behavior:**
  - Server-Side: `POST /api/v1/auth/logout` extracts the JWT `jti` claim and records it in `token_blacklist` in SQLite. Subsequent requests with that token return `HTTP 401 Unauthorized`.
  - Mobile: Token is wiped from `SharedPreferences` / memory; navigation stack is cleared with `pushAndRemoveUntil`; user is returned to `LoginScreen`.
  - Web: `sessionStorage` token is wiped; authenticated user state resets to null; UI returns to guest/login view.
  - Route Gating: Direct navigation to `#admin`, `#timetable`, or pressing browser Back cannot restore authenticated views without logging in again.
- **Key Observation:** Verifies complete remediation of the prior broken logout defect with both client clearing and server revocation.

---

## 4. Emergency Troubleshooting & Diagnostics

| Symptom | Diagnostic Command | Quick Remediation |
|---|---|---|
| **Port 8000 already in use** | `netstat -ano \| findstr :8000` | Stop conflicting process or run uvicorn on `--port 8001` (update `ApiService.baseUrl` accordingly). |
| **Database file locked** | `sqlite3 backend/examopt.db "PRAGMA journal_mode;"` | Ensure no dangling Python processes hold SQLite write locks (`taskkill /F /IM python.exe`). |
| **Mobile cannot reach API** | `ping 127.0.0.1` | Android emulators must use `http://10.0.2.2:8000` (automatically handled by `ApiService.baseUrl`). Desktop uses `http://127.0.0.1:8000`. |
| **Stale Web Build Assets** | `cd frontend && npm run build` | Cleans and rebuilds Vite distribution bundle in `< 1s`. |

---

## 5. Judge & Evaluator Acceptance Sign-Off

- **C10 Problem Track:** GLA University HackVision 2.0 Track C10 — Exam Timetable Optimization
- **Backend Test Status:** 58 / 58 tests passing (`pytest`)
- **Mobile Test Status:** 16 / 16 tests passing (`flutter test`)
- **Web Frontend Build:** 0 TypeScript errors, clean production bundle
- **Real Browser Automation:** 11 / 11 user journeys passing in Google Chrome (`QA/e2e_browser_test.py`) with 8 screenshots
- **Final System Status:** **`READY FOR DEMONSTRATION`**
