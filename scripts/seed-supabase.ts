/**
 * ExamOpt Studio — Supabase Cloud Seed Script
 * Uses Supabase PostgREST API with Service Role Key
 * to seed all ground truth records from GLA HackVision 2.0 (Problem C10)
 */

import {
  EXAMOPT_ROOMS,
  EXAMOPT_TIME_SLOTS,
  EXAMOPT_SUBJECTS,
  EXAMOPT_STUDENT_GROUPS,
  EXAMOPT_FEASIBLE_TIMETABLE,
} from "../lib/examopt-data";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tvyiqyngqehrxrcxqwei.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eWlxeW5ncWVocnhyY3hxd2VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjEyNDQ1MCwiZXhwIjoyMTA3NzAwNDUwfQ.9mc7hI9FXff68klJOh10ve7TGnVvaKEpgG_h2Dr6Khg";

async function postTable(table: string, records: unknown[]) {
  console.log(`📡 Seeding ${records.length} records into "${table}"...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Failed seeding "${table}" (${res.status}): ${errorText}`);
  } else {
    console.log(`✅ Successfully seeded "${table}"!`);
  }
}

async function run() {
  console.log("=================================================================");
  console.log("ExamOpt Studio — Live Supabase Cloud Database Seeder");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log("=================================================================\n");

  // 1. Rooms
  const roomRecords = EXAMOPT_ROOMS.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    building: r.building,
    capacity: r.capacity,
    room_type: r.roomType,
    facilities: r.facilities,
    is_active: r.isActive,
  }));
  await postTable("exam_rooms", roomRecords);

  // 2. Time Slots
  const slotRecords = EXAMOPT_TIME_SLOTS.map((s) => ({
    id: s.id,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    session: s.session,
    label: s.label,
    is_available: s.isAvailable,
  }));
  await postTable("time_slots", slotRecords);

  // 3. Subjects
  const subjectRecords = EXAMOPT_SUBJECTS.map((sub) => ({
    id: sub.id,
    code: sub.code,
    name: sub.name,
    program: sub.program,
    semester: sub.semester,
    duration_minutes: sub.durationMinutes,
    exam_type: sub.examType,
    requires_lab: sub.requiresLab,
    is_active: sub.isActive,
  }));
  await postTable("subjects", subjectRecords);

  // 4. Student Groups
  const groupRecords = EXAMOPT_STUDENT_GROUPS.map((g) => ({
    id: g.id,
    code: g.code,
    name: g.name,
    program: g.program,
    semester: g.semester,
    strength: g.strength,
  }));
  await postTable("student_groups", groupRecords);

  // 5. Students
  const studentRecords = [
    { id: "stu-1", roll_number: "GLA26-BCA-0001", name: "Aarav Sharma", email: "aarav.sharma@gla.ac.in", group_id: "grp-1", program: "BCA", semester: 1, is_active: true },
    { id: "stu-2", roll_number: "GLA26-BCA-0002", name: "Diya Patel", email: "diya.patel@gla.ac.in", group_id: "grp-1", program: "BCA", semester: 1, is_active: true },
    { id: "stu-3", roll_number: "GLA26-BCA-0003", name: "Rohan Verma", email: "rohan.verma@gla.ac.in", group_id: "grp-1", program: "BCA", semester: 1, is_active: true },
    { id: "stu-4", roll_number: "GLA26-BCADS-0001", name: "Meera Nair", email: "meera.nair@gla.ac.in", group_id: "grp-3", program: "BCA-DS", semester: 1, is_active: true },
    { id: "stu-5", roll_number: "GLA26-BCADS-0005", name: "Kabir Mehta", email: "kabir.mehta@gla.ac.in", group_id: "grp-3", program: "BCA-DS", semester: 1, is_active: true },
    { id: "stu-6", roll_number: "GLA26-BCA-3001", name: "Aditya Roy", email: "aditya.roy@gla.ac.in", group_id: "grp-4", program: "BCA", semester: 3, is_active: true },
    { id: "stu-7", roll_number: "GLA26-MCA-0001", name: "Pooja Mishra", email: "pooja.mishra@gla.ac.in", group_id: "grp-7", program: "MCA", semester: 1, is_active: true },
    { id: "stu-8", roll_number: "GLA26-MCA-0012", name: "Tanvi Saxena", email: "tanvi.saxena@gla.ac.in", group_id: "grp-7", program: "MCA", semester: 1, is_active: true },
    { id: "stu-9", roll_number: "GLA26-MCA-3001", name: "Vikram Malhotra", email: "vikram.malhotra@gla.ac.in", group_id: "grp-8", program: "MCA", semester: 3, is_active: true },
  ];
  await postTable("students", studentRecords);

  // 6. Enrollments
  const enrollmentRecords = [
    { student_id: "stu-1", subject_id: "sub-1", is_backlog: false },
    { student_id: "stu-1", subject_id: "sub-2", is_backlog: false },
    { student_id: "stu-1", subject_id: "sub-3", is_backlog: false },
    { student_id: "stu-1", subject_id: "sub-4", is_backlog: false },
    { student_id: "stu-3", subject_id: "sub-1", is_backlog: true },
    { student_id: "stu-3", subject_id: "sub-2", is_backlog: false },
    { student_id: "stu-5", subject_id: "sub-9", is_backlog: false },
    { student_id: "stu-5", subject_id: "sub-10", is_backlog: false },
    { student_id: "stu-5", subject_id: "sub-11", is_backlog: false },
    { student_id: "stu-5", subject_id: "sub-12", is_backlog: false },
    { student_id: "stu-8", subject_id: "sub-17", is_backlog: false },
    { student_id: "stu-8", subject_id: "sub-18", is_backlog: false },
    { student_id: "stu-8", subject_id: "sub-19", is_backlog: false },
    { student_id: "stu-8", subject_id: "sub-20", is_backlog: false },
  ];
  await postTable("enrollments", enrollmentRecords);

  // 7. Schedule Run
  const scheduleRun = [
    {
      id: "run-gla-v2-opt",
      name: "GLA Autumn 2026 Welsh-Powell Optimal Timetable",
      algorithm_name: "Welsh-Powell Graph Coloring",
      status: "published",
      dataset_version: "normal_gla_dataset",
      quality_score: 77.05,
      parameters: {
        room_utilization_pct: 87.63,
        slots_used: 6,
        hard_conflicts: 0,
        unused_capacity_seats: 245,
      },
      result: EXAMOPT_FEASIBLE_TIMETABLE,
    },
  ];
  await postTable("schedule_runs", scheduleRun);

  console.log("\n🎉 Live Supabase cloud seeding completed successfully!");
}

run().catch((err) => {
  console.error("Fatal error seeding Supabase:", err);
  process.exit(1);
});
