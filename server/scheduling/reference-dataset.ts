import { parse } from "csv-parse/sync";
import type { QualityTables } from "./data-quality";
import type { RawDataset } from "./normalize";
import { REFERENCE_VARIANTS, type ReferenceVariant } from "./reference-samples";

/**
 * Reference GLA dataset and edge-case files from `hackvision/backend/sample_datasets`,
 * embedded verbatim so the Test Lab and Vitest can run the reference test cases
 * in memory. Nothing here touches the database.
 *
 * Students are regenerated the way `seed_generator.py` builds them: every
 * member of a group sits all of the group's subjects, and roll numbers run
 * GLA26-{BCA|DS|MCA}-0001… across the groups in order. Names are omitted
 * (the reference draws them at random; the scheduler never reads them).
 */

const ROOMS_CSV = `room_id,name,building,capacity,room_type,unavailable_slots
AB11-101,CSED Block AB-XI Room 101,AB-XI CSED Block,80,THEORY,
AB11-102,CSED Block AB-XI Room 102,AB-XI CSED Block,80,THEORY,D2-M
AB11-103,CSED Block AB-XI Room 103,AB-XI CSED Block,60,THEORY,
AB11-201,CSED Block AB-XI Room 201,AB-XI CSED Block,100,THEORY,
AB11-202,CSED Block AB-XI Room 202,AB-XI CSED Block,100,THEORY,D4-E
AB11-203,CSED Block AB-XI Room 203,AB-XI CSED Block,80,THEORY,
AB11-301,CSED Block AB-XI Lecture Hall 301,AB-XI CSED Block,120,THEORY,
AB11-302,CSED Block AB-XI Lecture Hall 302,AB-XI CSED Block,120,THEORY,D1-M
AB11-AUD1,CSED Block AB-XI Mini Auditorium 1,AB-XI CSED Block,150,THEORY,
AB11-AUD2,CSED Block AB-XI Mini Auditorium 2,AB-XI CSED Block,150,THEORY,
AB11-LAB1,CSED Block AB-XI Central Computing Lab,AB-XI CSED Block,100,LAB,
AB11-LAB2,CSED Block AB-XI Data Science Lab,AB-XI CSED Block,90,LAB,D3-E
AB11-LAB3,CSED Block AB-XI Advanced Computing Lab,AB-XI CSED Block,90,LAB,
AB11-LAB4,CSED Block AB-XI Database Systems Lab,AB-XI CSED Block,80,LAB,
AB11-LAB5,CSED Block AB-XI AI & Cloud Lab,AB-XI CSED Block,80,LAB,D5-E`;

const TIMESLOTS_CSV = `slot_id,day_number,exam_date,session,time_range
D1-M,1,2026-10-19,MORNING,09:30 AM - 12:30 PM
D1-E,1,2026-10-19,EVENING,02:00 PM - 05:00 PM
D2-M,2,2026-10-20,MORNING,09:30 AM - 12:30 PM
D2-E,2,2026-10-20,EVENING,02:00 PM - 05:00 PM
D3-M,3,2026-10-21,MORNING,09:30 AM - 12:30 PM
D3-E,3,2026-10-21,EVENING,02:00 PM - 05:00 PM
D4-M,4,2026-10-22,MORNING,09:30 AM - 12:30 PM
D4-E,4,2026-10-22,EVENING,02:00 PM - 05:00 PM
D5-M,5,2026-10-23,MORNING,09:30 AM - 12:30 PM
D5-E,5,2026-10-23,EVENING,02:00 PM - 05:00 PM`;

const FACULTY_CSV = `faculty_id,name,department,unavailable_slots,max_duties
FAC-101,Dr. Ashish Sharma,CSED,D1-M|D4-E,5
FAC-102,Prof. Manoj Kumar,CSED,D2-E,4
FAC-103,Dr. Neha Agrawal,BCA,,5
FAC-104,Dr. Sachin Upadhyay,CSED,D3-M,4
FAC-105,Prof. Pooja Pathak,BCA,,4
FAC-106,Dr. Rajesh Singh,MCA,D5-E,5
FAC-107,Prof. Deepa Gupta,BCA,D1-E,4
FAC-108,Dr. Arvind Sharma,CSED,,6
FAC-109,Prof. Vikram Chaudhary,MCA,D2-M,4
FAC-110,Dr. Ritu Bhargava,BCA,,5
FAC-111,Prof. Amit Garg,CSED,D3-E,4
FAC-112,Dr. Sneha Verma,MCA,,5
FAC-113,Prof. Kamal Kant,CSED,D4-M,4
FAC-114,Dr. Preeti Tyagi,BCA,,4
FAC-115,Prof. Gaurav Bansal,CSED,D1-M,5
FAC-116,Dr. Anjali Mathur,MCA,,4
FAC-117,Prof. Saurabh Dixit,BCA,D5-M,4
FAC-118,Dr. Pradeep Rawat,CSED,,5
FAC-119,Prof. Sunita Kumari,MCA,D2-E,4
FAC-120,Dr. Pankaj Goswami,CSED,,6`;

const GROUPS_CSV = `group_id,name,program,semester,is_backlog_group,student_count
GRP-BCA-S1,BCA Semester 1 Regular,BCA,1,0,60
GRP-BCADS-S3,BCA (Data Science) Sem 3 Regular,BCA-DS,3,0,55
GRP-BCA-S3,BCA General Sem 3 Regular,BCA,3,0,50
GRP-BCADS-S5,BCA (Data Science) Sem 5 Regular,BCA-DS,5,0,55
GRP-MCA-S1,MCA Semester 1 Regular,MCA,1,0,65
GRP-BL-S5-S3,BCA-DS Sem 5 Cohort with Sem 3 Backlog,BCA-DS,5,1,25
GRP-BL-S3-S1,BCA Sem 3 Cohort with Sem 1 Backlog,BCA,3,1,25
GRP-BL-MCA-BCA,MCA Sem 1 Cohort with BCA Bridge Backlog,MCA,1,1,20`;

/** `seed_generator.py` GROUPS_CONFIG: the subjects every member of each group sits. */
const GROUP_SUBJECTS: Record<string, string[]> = {
  "GRP-BCA-S1": ["BCA-101", "BCA-102", "BCA-103", "BCA-104P"],
  "GRP-BCADS-S3": ["BCADS-301", "BCADS-302", "BCADS-303", "BCADS-304P", "BCADS-305P"],
  "GRP-BCA-S3": ["BCA-301", "BCA-302", "BCA-303", "BCA-304P"],
  "GRP-BCADS-S5": ["BCADS-501", "BCADS-502", "BCADS-503", "BCADS-504P", "BCADS-505P"],
  "GRP-MCA-S1": ["MCA-101", "MCA-102", "MCA-103", "MCA-104", "MCA-105P", "MCA-106P"],
  "GRP-BL-S5-S3": ["BCADS-501", "BCADS-502", "BCADS-503", "BCADS-504P", "BCADS-301", "BCADS-303"],
  "GRP-BL-S3-S1": ["BCA-301", "BCA-302", "BCA-303", "BCA-102", "BCA-104P"],
  "GRP-BL-MCA-BCA": ["MCA-101", "MCA-102", "MCA-103", "BCA-101"],
};

export { REFERENCE_VARIANTS, type ReferenceVariant };

type CsvRow = Record<string, string>;
export const parseCsv = (text: string): CsvRow[] => parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });

/** Students exactly as `seed_generator.py` enrolls them (names omitted). */
export function referenceStudents() {
  const groups = parseCsv(GROUPS_CSV);
  const students: { roll_no: string; group_id: string; enrolled_subject_ids: string; has_backlog: boolean }[] = [];
  let counter = 1;
  for (const group of groups) {
    const code = group.program === "BCA-DS" ? "DS" : group.program === "MCA" ? "MCA" : "BCA";
    for (let i = 0; i < Number(group.student_count); i++) {
      students.push({ roll_no: `GLA26-${code}-${String(counter++).padStart(4, "0")}`, group_id: group.group_id, enrolled_subject_ids: GROUP_SUBJECTS[group.group_id].join(","), has_backlog: group.is_backlog_group === "1" });
    }
  }
  return students;
}

/**
 * Raw CSV-shaped tables (strings, as the reference reads them) with one
 * subjects file swapped in, for the data quality report.
 */
export function referenceQualityTables(variant: ReferenceVariant = "normal"): QualityTables {
  const students = referenceStudents();
  return {
    rooms: parseCsv(ROOMS_CSV), timeslots: parseCsv(TIMESLOTS_CSV), faculty: parseCsv(FACULTY_CSV), studentGroups: parseCsv(GROUPS_CSV),
    subjects: parseCsv(REFERENCE_VARIANTS[variant].csv),
    students,
    enrollments: students.flatMap((s) => s.enrolled_subject_ids.split(",").map((subject_id) => ({ roll_no: s.roll_no, subject_id }))),
  };
}

/**
 * The same dataset typed as database rows, for the scheduling engine.
 *
 * `extraBigCourseStudents` adds students enrolled only in BCA-101 so that
 * the capacity-overflow file's declared 650 becomes an actual enrollment: the
 * engine schedules from enrollments, not from the declared count.
 */
export function referenceRawDataset(variant: ReferenceVariant = "normal", options: { extraBigCourseStudents?: number } = {}): RawDataset {
  const tables = referenceQualityTables(variant);
  const students = tables.students as ReturnType<typeof referenceStudents>;
  const extra = Array.from({ length: options.extraBigCourseStudents ?? 0 }, (_, i) => ({ roll_no: `GLA26-XBIG-${String(i + 1).padStart(4, "0")}`, group_id: "GRP-BCA-S1", has_backlog: false }));
  return {
    rooms: tables.rooms.map((r) => ({ room_id: String(r.room_id), name: String(r.name), capacity: Number(r.capacity), room_type: String(r.room_type), unavailable_slots: String(r.unavailable_slots ?? "") })),
    timeslots: tables.timeslots.map((t) => ({ slot_id: String(t.slot_id), exam_date: String(t.exam_date), session: String(t.session), time_range: String(t.time_range), day_number: Number(t.day_number) })),
    subjects: tables.subjects.map((s) => ({
      subject_id: String(s.subject_id), name: String(s.name), program: String(s.program), semester: Number(s.semester), duration_hours: Number(s.duration_hours),
      requires_lab: s.requires_lab === "1", fixed_slot: String(s.fixed_slot ?? "") || null, unavailable_slots: String(s.unavailable_slots ?? ""), enrolled_students: Number(s.enrolled_students),
    })),
    studentGroups: tables.studentGroups.map((g) => ({ group_id: String(g.group_id), program: String(g.program), semester: Number(g.semester), is_backlog_group: g.is_backlog_group === "1" })),
    students: [...students.map(({ roll_no, group_id, has_backlog }) => ({ roll_no, group_id, has_backlog })), ...extra],
    enrollments: [...(tables.enrollments as { roll_no: string; subject_id: string }[]), ...extra.map((s) => ({ roll_no: s.roll_no, subject_id: "BCA-101" }))],
    faculty: tables.faculty.map((f) => ({ faculty_id: String(f.faculty_id), name: String(f.name), department: String(f.department), unavailable_slots: String(f.unavailable_slots ?? ""), max_duties: Number(f.max_duties) })),
  };
}
