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
    alt: "Illustrative examination schedule dashboard with timetable, conflicts, and room utilisation panels",
    caption: "Illustrative web product preview",
  },
  conflicts: {
    src: "/Images/PPT Images/Examination Scheduling Conflict Dashboard.png",
    alt: "Illustrative web dashboard showing student, room, and time conflicts in an examination schedule",
    caption: "Illustrative web conflict view",
  },
  workspace: {
    src: "/Images/PPT Images/Smarter Examination Timetables Dashboard (1).png",
    alt: "Illustrative ExamOpt web workspace showing an examination timetable and validation summary",
    caption: "Illustrative web workspace preview",
  },
} as const;

/** Edit this one configuration to update the presentation's copy and assets. */
export const PRESENTATION_SLIDES: readonly PresentationSlide[] = [
  {
    number: 1,
    eyebrow: "ExamOpt Studio · GLA HackVision 2.0",
    title: "Examinations, scheduled with precision.",
    description:
      "An intelligent examination timetable workspace for turning complex constraints into clear, reviewable schedules.",
    keyPoints: ["Problem Track C10", "Illustrative product preview"],
    visual: "opening",
    image: PPT_IMAGES.schedule,
  },
  {
    number: 2,
    eyebrow: "The problem",
    title: "One timetable. Many constraints.",
    description:
      "Students, rooms, practical requirements, fixed dates, and unavailable spaces all compete for the same sessions.",
    keyPoints: [
      "Shared-student clashes",
      "Room and lab capacity",
      "Fixed and unavailable slots",
    ],
    visual: "problem",
    image: PPT_IMAGES.conflicts,
  },
  {
    number: 3,
    eyebrow: "Our solution",
    title: "From data to a validated timetable.",
    description:
      "A structured workflow keeps inputs, candidate schedules, validation, and human review connected.",
    keyPoints: ["Prepare data", "Generate", "Validate", "Review & publish"],
    visual: "workflow",
    image: PPT_IMAGES.schedule,
  },
  {
    number: 4,
    eyebrow: "The scheduling engine",
    title: "Three strategies. One validator.",
    description:
      "Different scheduling approaches can be compared against the same independent constraint checks.",
    keyPoints: ["First-Fit baseline", "Welsh–Powell heuristic", "Backtracking alternatives"],
    visual: "engine",
    note: "A valid schedule is not automatically a globally optimal one.",
  },
  {
    number: 5,
    eyebrow: "Web and mobile",
    title: "One platform. Two experiences.",
    description:
      "The web workspace supports administration and review, while a portrait mobile experience is reserved for student-facing timetable access.",
    keyPoints: ["Administrator workspace", "Shared API boundary", "Student mobile concept"],
    visual: "experiences",
    image: PPT_IMAGES.workspace,
    note: "The mobile surface shown here is a concept placeholder, not a completed application screenshot.",
  },
  {
    number: 6,
    eyebrow: "Architecture and data",
    title: "Structured data. Connected services.",
    description:
      "Records flow through scheduling and validation before a schedule is saved for the web workspace and future student experience.",
    keyPoints: ["Input records", "Scheduling & rooms", "Independent validation"],
    visual: "architecture",
    note: "Presentation visuals use illustrative, non-production sample data only.",
  },
  {
    number: 7,
    eyebrow: "Results and verification",
    title: "Validate the schedule, not just the screen.",
    description:
      "Evidence is separated into feasibility, hard-constraint validation, automated checks, and browser verification.",
    keyPoints: ["Feasibility", "Hard constraints", "Implementation checks"],
    visual: "verification",
    note: "No performance benchmarks or completion statistics are claimed in this presentation.",
  },
  {
    number: 8,
    eyebrow: "Demonstration",
    title: "Complex constraints. Clearer decisions.",
    description:
      "Prepare the data, run a strategy, validate the result, then review it before publishing.",
    keyPoints: ["Prepare", "Schedule", "Validate", "Review"],
    visual: "closing",
    image: PPT_IMAGES.schedule,
    note: "ExamOpt Studio · GLA HackVision 2.0 · Problem Track C10",
  },
] as const;

export const PRESENTATION_TITLE = "ExamOpt Studio · Product presentation";
