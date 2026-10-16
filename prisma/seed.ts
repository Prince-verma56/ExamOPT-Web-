import { Prisma, PrismaClient } from "@prisma/client";
import {
  EXAMOPT_ROOMS,
  EXAMOPT_TIME_SLOTS,
  EXAMOPT_SUBJECTS,
  EXAMOPT_STUDENT_GROUPS,
  EXAMOPT_FEASIBLE_TIMETABLE,
} from "../lib/examopt-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting ExamOpt Studio (GLA HackVision 2.0) database seed...");

  // 1. Seed Rooms (15 total: 10 theory + 5 labs)
  console.log("Seeding 15 examination venues in CSED Block AB-XI...");
  for (const r of EXAMOPT_ROOMS) {
    await prisma.examRoom.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        building: r.building,
        capacity: r.capacity,
        roomType: r.roomType,
        facilities: r.facilities as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        code: r.code,
        name: r.name,
        building: r.building,
        capacity: r.capacity,
        roomType: r.roomType,
        facilities: r.facilities as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  // 2. Seed Time Slots (10 slots)
  console.log("Seeding 10 examination time slots...");
  for (const s of EXAMOPT_TIME_SLOTS) {
    const slotDate = new Date(s.date);
    await prisma.timeSlot.upsert({
      where: {
        date_startTime_session: {
          date: slotDate,
          startTime: s.startTime,
          session: s.session,
        },
      },
      update: {
        endTime: s.endTime,
        label: s.label,
        isAvailable: true,
      },
      create: {
        date: slotDate,
        startTime: s.startTime,
        endTime: s.endTime,
        session: s.session,
        label: s.label,
        isAvailable: true,
      },
    });
  }

  // 3. Seed Subjects (24 courses)
  console.log("Seeding 24 subjects across BCA, BCA-DS, MCA...");
  for (const sub of EXAMOPT_SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: sub.code },
      update: {
        name: sub.name,
        program: sub.program,
        semester: sub.semester,
        durationMinutes: sub.durationMinutes,
        examType: sub.examType,
        requiresLab: sub.requiresLab,
        isActive: true,
      },
      create: {
        code: sub.code,
        name: sub.name,
        program: sub.program,
        semester: sub.semester,
        durationMinutes: sub.durationMinutes,
        examType: sub.examType,
        requiresLab: sub.requiresLab,
        isActive: true,
      },
    });
  }

  // 4. Seed Student Groups (8 cohorts)
  console.log("Seeding 8 student groups...");
  for (const g of EXAMOPT_STUDENT_GROUPS) {
    await prisma.studentGroup.upsert({
      where: { code: g.code },
      update: {
        name: g.name,
        program: g.program,
        semester: g.semester,
        strength: g.strength,
      },
      create: {
        code: g.code,
        name: g.name,
        program: g.program,
        semester: g.semester,
        strength: g.strength,
      },
    });
  }

  // 5. Seed Schedule Run (Welsh-Powell optimal result)
  console.log("Seeding baseline ScheduleRun record...");
  await prisma.scheduleRun.upsert({
    where: { id: "run-gla-v2-opt" },
    update: {
      status: "published",
      qualityScore: 77.05,
    },
    create: {
      id: "run-gla-v2-opt",
      name: "GLA Autumn 2026 End-Term Welsh-Powell Schedule",
      algorithmName: "Welsh-Powell Graph Coloring",
      status: "published",
      datasetVersion: "normal_gla_dataset",
      qualityScore: 77.05,
      parameters: {
        roomUtilizationPct: 87.63,
        slotsUsed: 6,
        hardConflicts: 0,
      },
      result: EXAMOPT_FEASIBLE_TIMETABLE as unknown as object,
      startedAt: new Date(),
      completedAt: new Date(),
      publishedAt: new Date(),
    },
  });

  console.log("✅ ExamOpt Studio database successfully seeded with GLA HackVision 2.0 ground truth!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
