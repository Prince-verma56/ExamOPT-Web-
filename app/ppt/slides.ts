export type PresentationVisual =
  | "opening"
  | "problem"
  | "workflow"
  | "engine"
  | "experiences"
  | "architecture"
  | "verification"
  | "closing";

export interface PresentationSlide {
  number: number;
  eyebrow: string;
  title: string;
  description: string;
  keyPoints: readonly string[];
  visual: PresentationVisual;
  image?: {
    src: string;
    alt: string;
    caption: string;
  };
  note?: string;
}

/**
 * These are independent, replaceable image references. The presentation does
 * not rely on a single flattened slide image.
 */
export const PPT_IMAGES = {
  schedule: {
    src: "/Images/PPT Images/Examination Schedule Dashboard UI.png",
    alt: "Examination schedule dashboard with timetable, conflicts, and room utilisation panels",
    caption: "Administrative schedule dashboard",
  },
  conflicts: {
    src: "/Images/PPT Images/Examination Scheduling Conflict Dashboard.png",
    alt: "Examination scheduling conflict matrix showing student, room, and time clashes",
    caption: "Master conflict detection matrix",
  },
  workspace: {
    src: "/Images/PPT Images/Smarter Examination Timetables Dashboard (1).png",
    alt: "ExamOpt web workspace showing timetable solver and validation summary",
    caption: "ExamOpt web workspace",
  },
  mobileAuth: {
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM.jpeg",
    alt: "ExamOpt mobile sign-in and role selection with student quick login",
    caption: "Mobile sign-in & role selection",
  },
  mobileCalendar: {
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (1).jpeg",
    alt: "ExamOpt mobile interactive monthly calendar with scheduled exams and room assignments",
    caption: "Mobile monthly exam calendar",
  },
  mobileTimetable: {
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (2).jpeg",
    alt: "ExamOpt mobile chronological student timetable feed with course codes, rooms, and dates",
    caption: "Mobile student timetable feed",
  },
  mobileConflict: {
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.08 PM (1).jpeg",
    alt: "ExamOpt mobile examination conflict warning with course clashes and verifier violation",
    caption: "Mobile proactive conflict alert",
  },
} as const;

/** Edit this one configuration to update the presentation's copy and assets. */
export const PRESENTATION_SLIDES: readonly PresentationSlide[] = [
  {
    number: 1,
    eyebrow: "ExamOpt Studio · GLA HackVision 2.0",
    title: "Automated, verifiable exam timetables.",
    description:
      "Built for real university constraints — transforming complex student enrolments, faculty rules, and room limitations into mathematically sound, conflict-free schedules.",
    keyPoints: [
      "Built for real university constraints",
      "Automated & verifiable timetables",
      "GLA HackVision 2.0 · Problem Track C10",
    ],
    visual: "opening",
    image: PPT_IMAGES.schedule,
    note: "ExamOpt Studio solves large-scale institutional exam scheduling through hybrid optimization.",
  },
  {
    number: 2,
    eyebrow: "The Problem",
    title: "Scheduling is costly. Conflicts spike.",
    description:
      "Institutions rely on spreadsheets and manual coordination, creating blind spots. Conflicts spike during peak periods, forcing last-minute room swaps, faculty stress, and student disruption.",
    keyPoints: [
      "Spreadsheets create blind spots across departments",
      "Student collisions & room capacity overflows",
      "Demonstrated with verified synthetic university data",
    ],
    visual: "problem",
    image: PPT_IMAGES.conflicts,
    note: "Manual coordination cannot evaluate millions of possible slot-room combinations across departments.",
  },
  {
    number: 3,
    eyebrow: "Algorithmic Limits",
    title: "Greedy fails; pure ILP is slow.",
    description:
      "Greedy heuristics place exams without global collision awareness, violating hard constraints. Integer Linear Programming (ILP) proves optimality, but solve times explode on larger batches.",
    keyPoints: [
      "Greedy lacks global collision awareness",
      "Pure ILP solve times explode exponentially",
      "A tailored search strategy balances feasibility and speed",
    ],
    visual: "engine",
    note: "Neither extreme solves university scheduling alone — a hybrid approach is mandatory.",
  },
  {
    number: 4,
    eyebrow: "Core Architecture",
    title: "The 5-stage hybrid pipeline.",
    description:
      "Deterministic constraint filtering eliminates impossible assignments early to trim the search space. A capacity-aware greedy allocator seeds baselines, followed by local search optimization.",
    keyPoints: [
      "1. Input Parsing (CSV import with schema checks)",
      "2. Constraint Prefiltering (trims search space early)",
      "3. Greedy Seeded Placement (respects all hard constraints)",
      "4. Local Optimization (hill-climbing swap refinement)",
      "5. Deterministic Verifier & Export (verifiable audit trail)",
    ],
    visual: "workflow",
    image: PPT_IMAGES.schedule,
    note: "Separating constraint prefiltering from local search guarantees speed without sacrificing correctness.",
  },
  {
    number: 5,
    eyebrow: "Unified Platform",
    title: "One platform. Two experiences.",
    description:
      "Administrative web workspace for data import, solver configuration, and manual overrides; mobile client presents read-only personal timetables, interactive calendars, and instant conflict alerts.",
    keyPoints: [
      "Admin Web: Ingest data, monitor solver & lock slots",
      "Mobile Student: Roll-based login & personalized feed",
      "Interactive calendar & instant conflict push alerts",
    ],
    visual: "experiences",
    image: PPT_IMAGES.workspace,
    note: "Interactive mobile preview: switch between Login, Calendar, Timetable, and Conflict Alert.",
  },
  {
    number: 6,
    eyebrow: "Operational Flow",
    title: "Unified workflow: ingest to mobile.",
    description:
      "From CSV import to verified student notifications — each step transitions seamlessly through validation checkpoints and exportable audit logs.",
    keyPoints: [
      "Import & Configure (CSV schema & conflict checks)",
      "Run & Monitor (live solver logs & diagnostics)",
      "Review & Adjust (slot locking & room overrides)",
      "Publish Timetable (ICS calendar & CSV exports)",
      "Mobile Read-Only (instant student notifications)",
    ],
    visual: "architecture",
    note: "Deterministic validation guards every step before publishing schedules to stakeholders.",
  },
  {
    number: 7,
    eyebrow: "Empirical Results",
    title: "Timetable metrics & zero violations.",
    description:
      "Benchmarked against synthetic university datasets. ExamOpt guarantees zero hard-constraint violations while significantly reducing soft-constraint penalties.",
    keyPoints: [
      "355 Students & 24 Examinations scheduled",
      "0 Hard-constraint violations (Student & Room clashes)",
      "42% Soft-penalty reduction via local optimization",
      "Deterministic QA audit logs generated",
    ],
    visual: "verification",
    note: "Synthetic demo dataset results verified by deterministic automated QA checks.",
  },
  {
    number: 8,
    eyebrow: "Validation Ready",
    title: "Prototype ready for validation.",
    description:
      "ExamOpt Studio executes web import, solves schedules, logs verification, and publishes mobile timetables. Ready for a 30–60 minute validation using institutional rosters.",
    keyPoints: [
      "End-to-end web & mobile prototype verified",
      "Import your institution's CSV roster",
      "Exportable audit report & ICS timetable feed",
      "GLA HackVision 2.0 · Problem Track C10",
    ],
    visual: "closing",
    image: PPT_IMAGES.schedule,
    note: "Built for real university constraints. Ready for demonstration.",
  },
] as const;

export const PRESENTATION_TITLE = "ExamOpt Studio · Product presentation";
