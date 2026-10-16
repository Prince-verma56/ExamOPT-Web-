/**
 * Illustrative sample data for homepage product previews.
 *
 * These values describe what the interface is designed to show. They are not
 * the output of a scheduling run and must always be rendered with a visible
 * "sample" label. Subject, room and slot codes follow the bundled dataset in
 * lib/examopt-data.ts.
 */

export type Program = "BCA" | "BCA-DS" | "MCA";

export interface PreviewExam {
  code: string;
  room: string;
  program: Program;
  practical?: boolean;
  fixed?: boolean;
  flagged?: boolean;
}

export const PREVIEW_DAYS = [
  { key: "D1", weekday: "Mon", date: "19 Oct" },
  { key: "D2", weekday: "Tue", date: "20 Oct" },
  { key: "D3", weekday: "Wed", date: "21 Oct" },
  { key: "D4", weekday: "Thu", date: "22 Oct" },
  { key: "D5", weekday: "Fri", date: "23 Oct" },
] as const;

export const PREVIEW_SESSIONS = [
  { key: "M", label: "Morning", time: "09:30" },
  { key: "E", label: "Evening", time: "14:00" },
] as const;

/** Keyed by `${dayKey}-${sessionKey}`, e.g. "D1-M". */
export const PREVIEW_TIMETABLE: Record<string, PreviewExam[]> = {
  "D1-M": [
    { code: "BCA-101", room: "AB11-101", program: "BCA" },
    { code: "MCA-301", room: "AB11-201", program: "MCA" },
  ],
  "D1-E": [{ code: "BCADS-101", room: "AB11-103", program: "BCA-DS" }],
  "D2-M": [
    { code: "BCA-301", room: "AB11-102", program: "BCA" },
    { code: "MCA-101", room: "AB11-104", program: "MCA" },
  ],
  "D2-E": [{ code: "BCA-104P", room: "LAB-1", program: "BCA", practical: true }],
  "D3-M": [
    { code: "BCA-302", room: "AB11-102", program: "BCA", flagged: true },
    { code: "BCADS-302", room: "AB11-105", program: "BCA-DS", flagged: true },
  ],
  "D3-E": [{ code: "MCA-102", room: "AB11-201", program: "MCA" }],
  "D4-M": [
    { code: "BCA-303", room: "AB11-101", program: "BCA" },
    { code: "MCA-302", room: "AB11-203", program: "MCA" },
  ],
  "D4-E": [{ code: "BCADS-104P", room: "LAB-3", program: "BCA-DS", practical: true }],
  "D5-M": [{ code: "BCA-304P", room: "LAB-2", program: "BCA", practical: true, fixed: true }],
  "D5-E": [{ code: "MCA-303", room: "AB11-202", program: "MCA" }],
};

export const PREVIEW_ROOM_LOAD = [
  { room: "AB11-101", pct: 88 },
  { room: "AB11-102", pct: 81 },
  { room: "AB11-201", pct: 62 },
  { room: "LAB-1", pct: 95 },
  { room: "LAB-3", pct: 47 },
];

/** Size of the bundled sample dataset (lib/examopt-data.ts). */
export const SAMPLE_DATASET = {
  subjects: 24,
  rooms: 15,
  timeSlots: 10,
  studentGroups: 8,
};
