# ExamOpt Studio — Initial UI/UX Audit

> **Audit Date:** 2026-10-16  
> **Auditor:** Senior Frontend Architect  
> **App Version:** Next.js 16.3.8, React 19.2.8, GSAP 3.15, Tailwind CSS 4, shadcn/ui  
> **Dev Server:** Running at localhost:3000

---

## 1. Technology Stack Summary

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.3.8 | App Router framework |
| React | 19.2.8 | UI library |
| Tailwind CSS | v4 | Utility-first styling |
| shadcn/ui | 4.21.2 | Component library (cards, dialogs, sidebar, etc.) |
| GSAP | 3.15.0 | Animation engine |
| GSAP ScrollTrigger | (bundled) | Scroll-based animations |
| GSAP SplitText | (bundled) | Text mask animations |
| Lenis | 1.0.42 | Smooth scrolling (@studio-freight/lenis) |
| Clerk | 7.9.11 | Authentication |
| Prisma | 7.10.0 | Database ORM |
| React Hook Form | 7.89.0 | Form handling |
| Zod | 4.6.5 | Validation |
| Recharts | 3.8.0 | Data visualization |
| Sonner | 2.0.8 | Toast notifications |
| Lucide React | 1.52.0 | Icons |
| Vitest | 5.0.3 | Unit testing |

---

## 2. Route Inventory

### 2.1 Public Marketing Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/` | `app/page.tsx` | Homepage with 7 sections | ✅ Functional |
| `/not-found` | `app/not-found.tsx` | Custom 404 page | ✅ Functional |

### 2.2 Authentication Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/sign-in/[[...sign-in]]` | `app/(auth)/sign-in/` | Clerk sign-in | ✅ Functional |
| `/sign-up/[[...sign-up]]` | `app/(auth)/sign-up/` | Clerk sign-up | ✅ Functional |
| `/login` | `app/(auth)/login/` | Custom login form | ✅ Functional |
| `/register` | `app/(auth)/register/` | Custom register form | ✅ Functional |

### 2.3 Admin Dashboard Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/admin` | `app/(admin)/admin/page.tsx` | Dashboard overview | ✅ Functional |
| `/admin/data` | `app/(admin)/admin/data/page.tsx` | Data workspace hub | ✅ Functional |
| `/admin/data/subjects` | `app/(admin)/admin/data/subjects/page.tsx` | Subjects & Exams CRUD | ✅ Functional |
| `/admin/data/rooms` | `app/(admin)/admin/data/rooms/page.tsx` | Rooms & Labs CRUD | ✅ Functional |
| `/admin/data/time-slots` | `app/(admin)/admin/data/time-slots/page.tsx` | Time Slots CRUD | ✅ Functional |
| `/admin/data/student-groups` | `app/(admin)/admin/data/student-groups/page.tsx` | Student Groups CRUD | ✅ Functional |
| `/admin/data/students` | `app/(admin)/admin/data/students/page.tsx` | Students view | ✅ Functional |
| `/admin/data/faculty` | `app/(admin)/admin/data/faculty/page.tsx` | Faculty view | ✅ Functional |
| `/admin/constraints` | `app/(admin)/admin/constraints/page.tsx` | Constraint management | ✅ Functional |
| `/admin/schedules` | `app/(admin)/admin/schedules/page.tsx` | Timetable grid | ✅ Functional |
| `/admin/optimization` | `app/(admin)/admin/optimization/page.tsx` | Optimization Lab | ✅ Functional |
| `/admin/conflicts` | `app/(admin)/admin/conflicts/page.tsx` | Conflict analysis | ✅ Functional |
| `/admin/import` | `app/(admin)/admin/import/page.tsx` | Import & Export | ✅ Functional |
| `/admin/analytics` | `app/(admin)/admin/analytics/page.tsx` | Analytics dashboard | ✅ Functional |
| `/admin/test-lab` | `app/(admin)/admin/test-lab/page.tsx` | Test Lab | ✅ Functional |
| `/admin/notifications` | `app/(admin)/admin/notifications/page.tsx` | Notifications | ✅ Functional |
| `/admin/settings` | `app/(admin)/admin/settings/page.tsx` | System settings | ✅ Functional |

### 2.4 Student Portal Routes

| Route | File | Purpose | Status |
|---|---|---|---|
| `/student` | `app/student/page.tsx` | Student timetable view | ✅ Functional |
| `/student/timetable` | `app/student/timetable/` | Student timetable details | ✅ Functional |
| `/student/exams` | `app/student/exams/` | Student exams list | ✅ Functional |

### 2.5 API Routes

| Route | Purpose |
|---|---|
| `/api/v1/subjects` | CRUD for subjects |
| `/api/v1/rooms` | CRUD for rooms |
| `/api/v1/time-slots` | CRUD for time slots |
| `/api/v1/student-groups` | CRUD for student groups |
| `/api/v1/students` | Student records |
| `/api/v1/faculty` | Faculty records |
| `/api/v1/metrics` | Dashboard metrics |
| `/api/v1/schedules` | Schedule management |
| `/api/v1/scheduling` | Scheduling engine |
| `/api/v1/validate` | Validation endpoint |
| `/api/v1/notifications` | Notifications |
| `/api/v1/timetable` | Timetable data |
| `/api/v1/jobs` | Background jobs |
| `/api/v1/benchmarks` | Algorithm benchmarks |
| `/api/v1/files` | File operations |
| `/api/v1/student-portal` | Student portal data |
| `/api/v1/realtime` | Realtime updates |
| `/api/v1/health` | Health check |
| `/api/health` | System health |
| `/api/ai` | AI endpoints |

---

## 3. Protected Hero Section — Baseline Record

### 3.1 Component Boundary
- **File:** `app/sections/hero.tsx`
- **Component:** `HeroSection`
- **ID:** `#hero`

### 3.2 Visual Composition
- Background: Static image `/Images/BG Images/HeroSectionBG.png` with `bg-[#eef2ff]` fallback
- Left-anchored editorial content in `max-w-[460px]` container
- AI-Powered Exam Scheduling pill badge
- "Smarter Examination Timetables" headline — bold slate-900 with blue italic "Timetables"
- Subtitle paragraph in slate-600
- Two CTA buttons: "Get started" (solid blue) and "Watch overview" (glass outline)
- Mobile fade gradient overlay `from-white/95 via-white/80 to-transparent`

### 3.3 Animation Behavior
- CSS transition-based staggered reveal (useState `isRevealed`)
- 180ms initial delay, then staged transitions at 80ms, 200ms, 320ms, 440ms
- `transform-gpu`, `cubic-bezier(0.16,1,0.3,1)` easing
- Dispatches `hero-animation-start` custom event
- **No GSAP** in this component — uses CSS transitions only

### 3.4 Dependencies
- Font: Uses Geist Sans (font-bold, font-semibold)
- Colors: `#eef2ff`, `#1a62ff`, `slate-900`, `slate-600`
- The `hero` scene in `scenes.ts` targets `[data-hero-*]` attributes — **NOT present** in the current hero component (the scene references a different hero structure)
- Shared utilities: `cn()` from `@/lib/utils`

### 3.5 Protection Notes
- The hero uses its own CSS transition animations, not the GSAP scene system
- The GSAP `hero` scene in `scenes.ts` references data attributes (`data-hero-glow`, `data-hero-photo`, etc.) that don't exist in the current hero — it's from a previous iteration
- Global CSS changes that affect `#eef2ff` background, Geist Sans font variables, or the hero's Tailwind classes could affect it
- **No modifications to this section are permitted**

---

## 4. Homepage Sections Audit (Post-Hero)

### 4.1 Problem Section (`app/sections/problem.tsx`)
- **Current state:** Rounded-top sheet overlapping hero, editorial header, orbital image wheel
- **Background:** `bg-[#faf9f5]` with `bg-[#eef2ff]` outer wrapper
- **Issues identified:**
  - The `OrbitalImageWheel` component is visually impressive but the image content (students, halls, calendars) could read as a generic gallery
  - Images are duplicated for wheel density — 6 unique + 6 duplicates
  - Transition from hero `#eef2ff` to problem `#faf9f5` uses rounded corners — this is well executed
  - The editorial header is well-composed

### 4.2 How It Works Section (`app/sections/how-it-works.tsx`)
- **Current state:** Three-stage process rail with ScrollTrigger-drawn line
- **Background:** `bg-[#faf9f5]` with `border-t border-[#ebe7df]/60`
- **Uses:** `Scene` wrapper (process scene), `RevealHeading`, `Reveal`, marketing primitives
- **Strengths:** Connected workflow visual, preview surfaces, rail animation
- **Issues identified:**
  - The three stages are well-implemented with native previews
  - Desktop horizontal rail with mobile vertical fallback works well
  - Minor: Stage card backgrounds could have slightly more visual differentiation

### 4.3 Capabilities Section (`app/sections/capabilities.tsx`)
- **Current state:** Sticky heading column + 6 capability cards in hairline-divided grid
- **Background:** `bg-canvas` (#f7f6f2)
- **Strengths:** Good hierarchy with sticky sidebar, status pills, hover effects
- **Issues identified:**
  - Cards have consistent treatment but subtle top-border glow on hover is refined
  - Grid uses `xl:grid-cols-3` which works well
  - Good status differentiation between "Available" and "In development"

### 4.4 Audiences Section (`app/sections/audiences.tsx`)
- **Current state:** Two-panel split — administrator workspace + student phone preview
- **Background:** `bg-[#faf9f5]` with `border-t border-[#ebe7df]/60`
- **Strengths:** Admin workspace preview uses real data from `EXAMOPT_ROOMS`, phone preview is realistic
- **Issues identified:**
  - Student section honestly notes Flutter app is planned for later phase
  - Parallax effects on both previews
  - Good visual differentiation between admin (cream) and student (blue)

### 4.5 Transparency Section (`app/sections/transparency.tsx`)
- **Current state:** Editorial column + conflict graph/validation preview
- **Background:** Complex gradient from canvas to `#eef3ff` back to canvas
- **Strengths:** Glass panel wrapper, dot grid background, conflict graph, validation summary
- **Issues identified:**
  - "Related conflict" floating chip has good depth treatment
  - Uses `Scene` wrapper for GSAP choreography
  - Background transition is sophisticated with radial gradient mask

### 4.6 Final CTA (`app/sections/final-cta.tsx`)
- **Current state:** Centered CTA with campus photograph below
- **Background:** `bg-canvas`
- **Issues identified:**
  - Campus photograph uses mask for smooth gradient fade at top/bottom
  - CTA buttons use consistent `ctaStyles` from primitives
  - Scene wrapper handles scroll-scrubbed parallax on the photograph
  - **Potential gap between CTA bottom and footer top needs verification**

### 4.7 Footer (`components/layout/examopt-footer.tsx`)
- **Current state:** Glassmorphic footer with rounded top, operational ribbon, grid layout
- **Strengths:** Operational status indicator, hackathon spotlight card, back-to-top button
- **Issues identified:**
  - "Constraint Engine: Active" and "100% Conflict-Free" claims should be verified against actual state
  - Footer uses `bg-white/95 backdrop-blur-2xl` glass effect
  - Footer has rounded top corners (`rounded-t-[36px]`) matching the problem section style

### 4.8 Navigation (`components/navigation/examopt-nav.tsx`)
- **Current state:** Fixed header with scroll-responsive glass surface, hide-on-scroll-down
- **Strengths:** IntersectionObserver active section tracking, smooth mobile drawer
- **Issues identified:**
  - Good keyboard accessibility and focus styles
  - Mobile drawer has proper navigation with close-on-navigate behavior
  - Uses `Sheet` from shadcn for mobile menu

---

## 5. Admin Interface Audit

### 5.1 Layout Architecture
- **Admin layout:** `SidebarProvider` + `AdminSidebar` + `AdminTopBar` + content area
- **Sidebar:** shadcn `Sidebar` component with 4 navigation groups (Overview, Data Management, Scheduling, Operations)
- **Top bar:** Breadcrumb navigation, student portal link, timetable grid link, notifications bell
- **Content area:** `p-6 max-w-7xl mx-auto` with `bg-muted/20` background

### 5.2 Dashboard Overview
- **Hero card:** HackVision badge, display heading, description, quick links
- **Metric cards:** 4 cards (Subjects, Active rooms, Student groups, Available slots) using real API data
- **Data readiness:** Two-column panel showing presence checks and scheduling status
- **Enrollment context:** Three metric columns (Students, Enrollments, Backlogs)
- **Issues:**
  - Single-line dashboard overview component (minified JSX) — hard to maintain
  - Cards use basic `Card` component without glass effects
  - Good data from `/api/v1/metrics` — real database counts

### 5.3 Resource Workspace (CRUD Pages)
- **Component:** `components/examopt/resource-workspace.tsx`
- **Used by:** Subjects, Rooms, Time Slots, Student Groups pages
- **Features:** Search, pagination, create/edit form, delete confirmation
- **Issues:**
  - Forms are functional but use plain HTML `<select>` and `<input type="checkbox">`
  - Edit form opens inline as a Card with `border-primary/25`
  - No toast notifications on success/error — uses inline banner
  - Delete uses `window.confirm()` — no custom confirmation dialog
  - Table has horizontal overflow on mobile with `min-w-[720px]`
  - No animation on form open/close or record creation
  - Form fields use basic spacing without clear visual grouping

### 5.4 Admin Sidebar
- **Groups:** Overview, Data Management, Scheduling, Operations
- **Active state:** `bg-primary/10 text-primary`
- **Footer:** SafeUserButton with admin label
- **Issues:**
  - Sidebar is well-structured with proper group labels
  - Active route detection works (exact match for dashboard, prefix for others)
  - No badge indicators currently used on any item

### 5.5 Scheduling Pages
- **Constraints, Timetable, Optimization Lab, Conflict Analysis** — all functional
- Complex components in `components/scheduling/`
- Optimization Lab has 31KB component — the most complex page

### 5.6 Settings Page
- Two cards: Academic Session & Campus, Optimizer Defaults
- Uses `Switch` components for toggles
- Form data appears static (not connected to API save)

### 5.7 Notifications Page
- Static notification list with 3 hardcoded items
- Uses Card components with hover effects
- "Broadcast to Students" button present

---

## 6. Animation System Audit

### 6.1 GSAP Setup
- **Registration:** `animations/core/gsap-setup.ts` — plugins registered once
- **Plugins:** ScrollTrigger, SplitText
- **Reduced motion:** `prefersReducedMotion()` check, `motion-ok` class on html

### 6.2 Existing Presets
- `fade`, `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`, `scaleUp`, `slideUp`, `stagger`, `textReveal`, `parallax`
- All pure data objects with `from`/`to` TweenVars

### 6.3 Hooks
- `useGsap` — main hook with gsap.context cleanup, reduced-motion skip
- `useScrollTrigger` — convenience wrapper returning a ref
- `useMotionReady` — waits for preloader completion
- `useScroll` — basic scroll threshold detection

### 6.4 Page Scenes
- `hero` — references data attributes not present in current hero (legacy)
- `process` — rail draw animation for How It Works
- `transparency` — graph build, validation rows, meter fill
- `closing` — campus photograph parallax and CTA copy entrance

### 6.5 Marketing Motion Components
- `RevealHeading` — SplitText line-mask reveal
- `Parallax` — scroll-scrubbed vertical drift
- `ClipReveal` — clip-path wipe for images
- `Reveal` — scroll-triggered entrance with `[data-reveal]`

### 6.6 Smooth Scroll
- `SmoothScrollProvider` — single Lenis instance, coordinated with GSAP ticker
- Properly cleans up on unmount
- Disabled when `prefers-reduced-motion: reduce`

### 6.7 Issues Identified
- The `hero` scene in scenes.ts targets attributes from a different hero iteration
- No GSAP animations on admin pages currently
- No text-mask reveals outside existing section headings
- Form and CRUD operations have no transition animations
- Dialog/sheet transitions rely on shadcn defaults

---

## 7. Responsive Behavior Audit

### 7.1 Homepage
- Hero: Mobile gradient overlay for text readability
- Problem: Responsive rounded corners `rounded-t-[36px] sm:rounded-t-[48px] lg:rounded-t-[56px]`
- How It Works: Vertical rail on mobile, horizontal on desktop
- Capabilities: 1 column → 2 columns (sm) → 3 columns (xl)
- Audiences: Single column → 12-col grid on desktop
- Footer: Responsive grid, stacked on mobile

### 7.2 Admin
- Sidebar: Uses shadcn `SidebarProvider` with collapsible behavior
- Top bar: Quick links hidden on mobile (`hidden sm:inline-flex`)
- Content: `max-w-7xl mx-auto` with `p-6` padding
- Tables: `min-w-[720px]` with `overflow-x-auto` — horizontal scroll on mobile
- Forms: `grid-cols-1 md:grid-cols-3` responsive

### 7.3 Known Responsive Issues
- Table content may be unreadable on small screens due to horizontal scrolling
- Mobile sidebar drawer behavior needs verification
- Admin top bar hides Student Portal and Timetable Grid links on mobile

---

## 8. Design Token Analysis

### 8.1 Color System
- **Primary:** `#2855c7` (cobalt blue)
- **Canvas:** `#f7f6f2` (warm off-white)
- **Surface:** `#ffffff` (white)
- **Foreground:** `#172033` (deep slate)
- **Muted foreground:** `#667085`
- **Hairline:** `#e7e4db`
- **Success:** `#12805c`
- **Warning:** `#b7791f`
- **Error/Destructive:** `#c83c4b`

### 8.2 Typography
- **Sans (functional):** Geist Sans — navigation, body, controls, data UI
- **Display (editorial):** Instrument Serif — marketing headlines only
- **Mono:** Geist Mono — code, technical labels

### 8.3 Surface System
- `bg-canvas` → `#f7f6f2` (warm off-white)
- `bg-canvas-deep` → `#efede6`
- `bg-surface` → `#ffffff`
- Homepage sections alternate: `#eef2ff` → `#faf9f5` → `#f7f6f2` → `#faf9f5` → gradient → `#f7f6f2`

### 8.4 Glass Utility
- Defined as `@utility glass` in globals.css
- `bg: rgb(255 255 255 / 0.72)`, `backdrop-filter: blur(14px) saturate(150%)`
- Used by transparency section panel and related-conflict chip
- **Not yet applied to admin cards or homepage feature cards**

---

## 9. Build & Lint Status

### 9.1 Available Scripts
- `npm run typecheck` — TypeScript checking
- `npm run lint` — ESLint
- `npm run test` — Vitest
- `npm run build` — Production build
- `npm run doctor` — Project diagnostics
- `npm run audit:project` — Typecheck + lint + test combined

### 9.2 E2E Testing
- Playwright mentioned but not configured (`"test:e2e": "echo \"E2E tests not yet configured\""`)
- Vitest is the primary test runner
- Tests directory exists with `unit/`, `integration/`, `e2e/` (with `.gitkeep` only)

---

## 10. Summary of Issues to Address

### Priority 1 — Visual Consistency
1. Homepage section backgrounds need smoother transitions
2. Admin dashboard cards lack premium treatment
3. Resource workspace forms use plain HTML controls
4. Glass effects are underutilized outside the transparency section

### Priority 2 — CRUD Experience
5. Delete confirmation uses `window.confirm()` instead of custom dialog
6. No toast notifications for CRUD operations
7. No animation for form open/close or record state changes
8. Edit form inline styling is basic

### Priority 3 — Animation System
9. Hero scene in scenes.ts references non-existent data attributes
10. No GSAP animations on admin pages
11. Text-mask reveals limited to `RevealHeading` on homepage
12. Missing entrance animations for admin page content

### Priority 4 — Responsive
13. Tables need better mobile strategy
14. Admin mobile sidebar needs verification
15. Footer gap before CTA needs checking

### Priority 5 — Accessibility
16. Form labels need `htmlFor` attributes
17. Delete confirmation needs accessible dialog
18. Color-only status indicators need text labels (partially done)
19. Focus management in forms and dialogs

---

> **Next Step:** Proceed with the redesign plan, beginning with hero protection verification, then establishing the unified visual system, and implementing improvements section by section.
