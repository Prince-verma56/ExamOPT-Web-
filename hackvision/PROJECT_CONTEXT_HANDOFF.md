# ExamOpt — Complete Project Context & Resume Handoff Document
**GLA University HackVision 2.0 — Problem Statement C10**  
**Intelligent Examination Timetable Optimization System**

> **Notice for the AI Assistant upon session resumption:**  
> This file contains the complete system architecture, operational state, test verification results, startup instructions, and release artifacts for the ExamOpt project. Read this file first to resume development, demonstration, or evaluation seamlessly after system reboot.

---

## 1. Executive Status & Readability Summary

- **Problem Statement:** GLA HackVision 2.0 Track **C10** (Intelligent Examination Timetable Optimization System).
- **Current Completion:** **100% Complete & Formally Audited (Grade: A+)**.
- **Audit Verification:** All 33 functional and algorithmic requirements passed in [`QA/EXAMOPT_QA_REPORT.md`](file:///c:/Users/prakhyat/Documents/hackvision/QA/EXAMOPT_QA_REPORT.md).
- **Test Suite Health:** **60 / 60 automated tests passing** (47 backend pytest tests + 13 mobile Flutter widget tests + 0 frontend TypeScript/Vite errors).
- **Hard-Constraint Status:** Zero student clashes, zero room double-bookings, zero capacity overflows, zero lab type mismatches, 100% fixed-slot locks preserved.
- **Installable APK:** Located on the desktop at `C:\Users\prakhyat\Desktop\ExamOpt.apk`.

---

## 2. System Architecture & Repository Layout

```
c:\Users\prakhyat\Documents\hackvision/
├── backend/                        # FastAPI Backend & Algorithmic Optimization Engine
│   ├── .venv/                      # Python 3.15 Virtual Environment
│   ├── app/
│   │   ├── algorithms/             # C10 Scheduling Algorithms
│   │   │   ├── baseline_first_fit.py    # Algorithm A: Sequential Greedy First-Fit Baseline
│   │   │   ├── welsh_powell.py          # Algorithm B: Degree-Ordered Graph Coloring (Benchmark Winner: 87.63% util)
│   │   │   ├── backtracking.py          # Algorithm C: MRV + Forward Checking Solver (Fastest: 0.30 ms)
│   │   │   ├── conflict_graph.py        # Student Shared-Enrollment Graph (Regular + Cross-Semester Backlog)
│   │   │   ├── room_allocator.py        # Best-Fit Capacity Packing & LAB/THEORY Guard
│   │   │   └── faculty_allocator.py     # Invigilation Duty Balancer & Department Alignment
│   │   ├── database/               # Dual-Adapter Repository Pattern (SQLite & Supabase)
│   │   │   ├── base.py                  # Abstract Repository Interface
│   │   │   ├── sqlite_repository.py     # Local SQLite3 Implementation (`backend/examopt.db`)
│   │   │   └── supabase_repository.py   # Cloud Postgres Supabase REST Client
│   │   ├── services/
│   │   │   ├── optimizer.py             # Multi-Algorithm Benchmark & Composite Soft Score Calculator
│   │   │   └── exporter.py              # Timetable & Room-Wise CSV Exporter
│   │   └── auth.py                 # RBAC (Admin, Faculty, Student Isolation Boundaries)
│   ├── main.py                     # FastAPI REST API Routes & Static SPA Host
│   ├── validator.py                # Data Quality, Capacity Overflow & Lab Bottleneck Validator
│   ├── schema.sql                  # Database Schema Definition
│   └── tests/                      # Automated Test Suite (47 tests)
│       ├── test_c10_qa_comprehensive.py # 15 C10 QA Audit Scenarios & Independent Constraint Checker
│       ├── test_algorithms.py      # Algorithm Unit & Benchmark Tests
│       ├── test_api.py             # API Authentication & Endpoint Tests
│       ├── test_data_validation.py # Dataset Quality Tests
│       ├── test_database_adapters.py # Repository Adapter Tests
│       └── test_supabase_security.py # Supabase Security & RLS Tests
│
├── frontend/                       # Web Frontend (React 19 + TypeScript + Vite + Tailwind/CSS)
│   ├── src/
│   │   ├── components/             # Dashboard, TimetableGrid, AlgorithmComparison, Portal Views
│   │   ├── services/api.ts         # Axios/Fetch REST Client
│   │   ├── App.tsx                 # Root Navigation & View Routing
│   │   └── index.css               # Modern High-Aesthetic Theme Tokens
│   ├── package.json
│   └── vite.config.ts
│
├── examopt_mobile/                 # Flutter Mobile Client (Android & Web)
│   ├── lib/
│   │   ├── main.dart               # Student & Faculty Timetable Mobile App
│   │   ├── models/                 # Allocation, Duty, and Subject Data Models
│   │   └── screens/                # Home, Timetable Grid, Duties, Details, Notifications, Profile
│   ├── test/widget_test.dart       # 13 Automated Mobile Widget Tests (All Passing)
│   └── pubspec.yaml
│
├── QA/                             # QA Audit & Machine-Readable Verification
│   ├── EXAMOPT_QA_REPORT.md        # Authoritative 33-Requirement Traceability Matrix
│   ├── test_results.json           # Machine-Readable JSON Test Benchmark & Metrics
│   └── run_audit_collector.py      # Automated Verification & Benchmark Runner
│
└── Launch_Android_Emulator.bat      # Helper to Launch Android Emulator API 37
```

---

## 3. Post-Reboot Startup Guide (Step-by-Step)

When you restart the laptop, run these commands in separate PowerShell terminals to bring all services back online:

### Terminal 1: Start the Backend REST API (Port 8000)
```powershell
cd c:\Users\prakhyat\Documents\hackvision
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```
- **Backend API:** `http://127.0.0.1:8000`
- **Interactive OpenAPI/Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **Health Check Endpoint:** `http://127.0.0.1:8000/health`

### Terminal 2: Start the Web Frontend (Port 5173)
```powershell
cd c:\Users\prakhyat\Documents\hackvision\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- **Web Dashboard URL:** `http://127.0.0.1:5173`

### Terminal 3: Run Flutter Mobile Client (Choose Web or Android)

**Option A — Flutter Web (Immediate browser demonstration):**
```powershell
cd c:\Users\prakhyat\Documents\hackvision\examopt_mobile
flutter run -d web-server --web-port=5175
```
- **Mobile Web URL:** `http://localhost:5175`

**Option B — Android Emulator (Desktop phone demo):**
1. Double-click [`Launch_Android_Emulator.bat`](file:///c:/Users/prakhyat/Documents/hackvision/Launch_Android_Emulator.bat) or run:
   ```powershell
   & "C:\Users\prakhyat\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd "Medium_Phone_API_37.0"
   ```
2. Once the phone boots, launch Flutter onto the emulator:
   ```powershell
   cd c:\Users\prakhyat\Documents\hackvision\examopt_mobile
   flutter run -d emulator-5554
   ```

**Option C — Install Pre-built APK directly onto any Android device:**
- Transfer the file `C:\Users\prakhyat\Desktop\ExamOpt.apk` to your phone or run:
  ```powershell
  adb install -r C:\Users\prakhyat\Desktop\ExamOpt.apk
  ```

---

## 4. Verification & Testing Commands

To re-run all validation checks at any time:

```powershell
# 1. Run Complete Backend Test Suite (47/47 passing in ~0.75s)
cd c:\Users\prakhyat\Documents\hackvision
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v

# 2. Run Algorithmic Benchmark & Update QA/test_results.json
backend\.venv\Scripts\python.exe QA/run_audit_collector.py

# 3. Run Mobile Widget Test Suite (13/13 passing in ~1.2s)
cd examopt_mobile
flutter test
cd ..

# 4. Verify Frontend Production Build
cd frontend
npm run build
cd ..
```

---

## 5. Algorithmic Benchmark Summary (Problem Statement C10)

Executed on the GLA University dataset (24 subjects, 15 rooms, 10 slots, 20 faculty, 355 enrollments):

| Algorithm | Status | Exams Scheduled | Room Capacity Utilization | Slots Used | Runtime | Soft Score | Independent Verification |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **First-Fit Baseline** | `FEASIBLE` | 24 / 24 (100%) | 86.75% | 6 / 10 | 2.23 ms | 76.70 | **0 Violations (PASS)** |
| **Welsh-Powell Graph** | `FEASIBLE` | 24 / 24 (100%) | **87.63% (Top)** | 6 / 10 | 0.52 ms | **77.05 (WINNER)**| **0 Violations (PASS)** |
| **Constraint Backtrack**| `FEASIBLE` | 24 / 24 (100%) | 87.19% | 6 / 10 | **0.30 ms (Fast)** | 76.88 | **0 Violations (PASS)** |

### Hard Constraints Enforced:
1. **Student Clash-Free:** No student has overlapping exams (verified across regular cohort and cross-semester backlog students).
2. **Room Double-Booking Guard:** A room can never host more than 1 exam in any given slot.
3. **Room Capacity Guard:** Enrolled student count $\le$ room capacity (boundary tested at 60 seats vs 61 students).
4. **Specialized Room Guard:** `requires_lab=True` courses are strictly mapped to `LAB` rooms; theory courses use lecture halls.
5. **Fixed Slot Lock:** Pre-locked administrative slots are strictly preserved during optimization.
6. **Unavailable Period Compliance:** Blocked timeslots for subjects and rooms are strictly avoided.
7. **Duration Boundaries:** Standard 2-hour and 3-hour durations fit cleanly within session windows.
8. **Faculty Duty Allocation:** Maximum duties respected; no faculty member double-booked in a single slot.

---

## 6. Security, Authorization & Database Configuration

- **Database Mode Selection:** Controlled via `.env` file (`DATABASE_BACKEND=sqlite` or `DATABASE_BACKEND=supabase`).
- **Local Database:** `backend/examopt.db` (SQLite3).
- **Cloud Database:** Supabase Postgres REST client with Row Level Security (RLS) active across all 11 tables.
- **User Roles & Boundaries:**
  - `ADMIN`: Full access to timetable generation, multi-algorithm comparison, preset loading, and atomic publication.
  - `STUDENT`: Scoped access; can query only their own timetable via roll number (`/api/v1/timetable/student?roll_no=...`). Accessing other students returns `HTTP 403 Forbidden`.
  - `FACULTY`: Scoped access; can query only their assigned invigilation duties (`/api/v1/timetable/faculty?faculty_id=...`). Accessing other faculty returns `HTTP 403 Forbidden`.
  - `PUBLIC`: Can view only the officially published timetable via `/api/v1/schedules/active-published`. Confidential draft runs are blocked.

---

## 7. Key Files for Quick Reference

- **Authoritative QA Audit Report:** [`QA/EXAMOPT_QA_REPORT.md`](file:///c:/Users/prakhyat/Documents/hackvision/QA/EXAMOPT_QA_REPORT.md)
- **Machine-Readable Benchmark Data:** [`QA/test_results.json`](file:///c:/Users/prakhyat/Documents/hackvision/QA/test_results.json)
- **Comprehensive Audit Tests:** [`backend/tests/test_c10_qa_comprehensive.py`](file:///c:/Users/prakhyat/Documents/hackvision/backend/tests/test_c10_qa_comprehensive.py)
- **Android APK Path:** `C:\Users\prakhyat\Desktop\ExamOpt.apk`
