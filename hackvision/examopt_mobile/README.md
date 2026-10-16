# ExamOpt Mobile — High-Fidelity Flutter & Dart Application

A ditto-copy mobile application built with **Flutter 3.47 & Dart 3.13** faithfully implementing all 15 screens from the ExamOpt UI specification.

---

## 📱 15-Screen Design Architecture

| # | Screen Name | Role | Theme | Key Components |
|---|---|---|---|---|
| **01** | **Student Home** | Student | Light | Greeting, Hero Next Exam ("2 Days Left"), 4 Action Pills, Today's Schedule, Bottom Nav |
| **02** | **Student Timetable** | Student | Light | Date Grouping (October & November 2026), Filter Pills (All/Upcoming/Completed), Room Badges |
| **03** | **Student Calendar** | Student | Light | Monthly Date Picker (Oct 2026), Active Selection (17th), Scheduled Cards, Floating Action Button (+) |
| **04** | **Exam Details** | Student | Light | Subject & Code, Date/Time/Reporting Time, Important Instructions Checklist, Calendar Action Buttons |
| **05** | **Notifications** | Both | Light | Categorized Feed (Today/Yesterday/Earlier), Category Pills (Exam Updates, Reminders, General) |
| **06** | **Student Profile** | Student | Light | Circular Avatar, ID (2024CSE1023), Email, Appearance & Notification Settings, Sign Out Button |
| **07** | **Search & Filters** | Both | Light | Search Bar, Recent Searches with History, Filters (Date, Subject, Exam Type, Room, Status) |
| **08** | **Conflict Alert** | Student | Alert | Warning Illustration, Clash Detected Banner, Two Overlapping Slot Cards, Resolution Actions |
| **09** | **Empty & Loading States** | Both | Dual | Top: 3D Folder Graphic & "No Upcoming Exams"; Bottom: Timetable Shimmer/Skeleton Placeholders |
| **10** | **Faculty Home** | Faculty | Light/Gold | Dr. Priya Sharma Greeting, Gold Duty Card, "Reporting at 08:30 AM" badge, Today's Duty with "Current" |
| **11** | **Faculty Duties** | Faculty | Light | Invigilation Duties Grouped by Date (Tue 17 Oct to Thu 26 Oct), "Today" Badges, Search & Filters |
| **12** | **Duty Details** | Faculty | Light | Invigilation Room/Hall, Subject, Timings, Invigilator Checklist, Examination Cell Phone Contact |
| **13** | **Room & Seating Plan** | Faculty | Light | AB-1 Hall 204 Summary, 97% Circular Gauge, Interactive 6×10 Seating Matrix (A–F, 1–10), Legend |
| **14** | **Faculty Profile** | Faculty | Light | Faculty Avatar, Employee ID (FAC2021), Department, Contact Phone, Appearance Toggles |
| **15** | **Student Home (Dark)** | Student | Dark | Deep Midnight Navy (`#090D16`), Illuminated Neon Blue Cards, Glowing Badges, Dark Bottom Bar |

---

## 🚀 Running the App

The app connects to the deployed ExamOpt API at `https://exam-opt-web.vercel.app`
by default. To point it at a local development server, override the API URL
with `--dart-define=API_BASE_URL=http://10.0.2.2:3000` (Android emulator).
Clerk sign-in also requires the public Clerk publishable key used by the web
app; provide it at build/run time with
`--dart-define=CLERK_PUBLISHABLE_KEY=pk_...`. Never use a Clerk secret key in
the mobile app.

### 1. Run on Chrome (Web)
```powershell
cd examopt_mobile
flutter run -d chrome --dart-define=CLERK_PUBLISHABLE_KEY=pk_...
```

### 2. Run on Local Web Server
```powershell
cd examopt_mobile
flutter run -d web-server --web-port=5175 --dart-define=CLERK_PUBLISHABLE_KEY=pk_...
```

### 3. Run on Connected Mobile / Android Device
```powershell
cd examopt_mobile
flutter run -d <device-id> --dart-define=CLERK_PUBLISHABLE_KEY=pk_...
```

### 4. Run Automated Widget Tests (13/13 Passing)
```powershell
cd examopt_mobile
flutter test
```

---

## 🎨 Interactive Showcase Features
- **Direct Screen Switcher:** Tap the top control banner or open the side drawer to jump directly to any of the 15 numbered screens with one click.
- **Role Switcher:** Instant 1-tap toggle between **Student Mode** and **Faculty Mode**.
- **Theme Switcher:** Seamless live toggling between **Light Mode** and **Dark Mode** (Screen 15).
- **Responsive Bezel:** On desktop browsers, displays inside a photorealistic smartphone bezel (with status bar, notch, and clock "9:41"). Automatically expands to full width on mobile devices.
