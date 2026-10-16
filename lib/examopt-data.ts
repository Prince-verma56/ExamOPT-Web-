/**
 * ExamOpt Studio — Core Dataset & Benchmark Engine
 * Sourced directly from GLA HackVision 2.0 (Problem Statement C10)
 * Context: GLA University, Mathura (CSED Block AB-XI, BCA / BCA-DS / MCA Programs)
 */

export interface ExamRoomData {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  roomType: "standard" | "lab" | "auditorium";
  facilities: Record<string, unknown>;
  isActive: boolean;
}

export interface TimeSlotData {
  id: string;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  session: "morning" | "evening";
  label: string;
  isAvailable: boolean;
}

export interface SubjectData {
  id: string;
  code: string;
  name: string;
  program: string;
  semester: number;
  durationMinutes: number;
  examType: "theory" | "practical";
  requiresLab: boolean;
  enrollmentCount: number;
  isActive: boolean;
  fixedSlotId?: string;
}

export interface StudentGroupData {
  id: string;
  code: string;
  name: string;
  program: string;
  semester: number;
  strength: number;
}

export interface FacultyData {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  maxInvigilations: number;
  assignedCount: number;
}

export interface StudentLookupExam {
  subject_id: string;
  subject_name: string;
  exam_date: string;
  session: string;
  time_range: string;
  slot_id: string;
  room_id: string;
  room_name: string;
}

export interface StudentLookupData {
  roll_no: string;
  student_name: string;
  group_id: string;
  program: string;
  enrolled_exams_count: number;
  schedule: StudentLookupExam[];
}

export interface AlgorithmBenchmark {
  algorithm: string;
  name: string;
  status: string;
  is_feasible: boolean;
  scheduled_exams: number;
  unscheduled_exams: number;
  hard_conflicts: number;
  slots_used: number;
  room_utilization_pct: number;
  unused_capacity_seats: number;
  execution_time_ms: number;
  soft_score: number;
  isRecommended?: boolean;
}

export interface EdgeCaseResult {
  status: string;
  is_valid: boolean;
  readiness_score: number;
  detected_error?: string;
  message?: string;
  detected_errors_count?: number;
  error_codes?: string[];
  remediation?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATASET: GLA University, Mathura CSED Block AB-XI
// ─────────────────────────────────────────────────────────────────────────────

export const EXAMOPT_SYSTEM_METADATA = {
  system: "ExamOpt: Intelligent Examination Timetable Optimization System",
  problem_statement: "Problem C10 (GLA HackVision 2.0)",
  context: "GLA University, Mathura (CSED Block AB-XI, BCA / BCA-DS / MCA Programs)",
  timestamp: "2026-10-16T11:30:00+05:30",
  active_preset: "normal",
  counts: {
    rooms: 15,
    timeslots: 10,
    faculty: 20,
    subjects: 24,
    student_groups: 8,
    student_enrollments: 355,
    student_subject_enrollments: 1735,
    backlog_students: 70,
  },
  campus_capacity: {
    total_theory_seats: 1040,
    total_lab_seats: 440,
    total_rooms: 15,
    total_seats: 1480,
  },
};

export const EXAMOPT_ROOMS: ExamRoomData[] = [
  // 10 Theory Rooms (Total = 1040 seats)
  { id: "room-1", code: "AB11-101", name: "CSED Block AB-XI Room 101", building: "AB-XI", capacity: 120, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-2", code: "AB11-102", name: "CSED Block AB-XI Room 102", building: "AB-XI", capacity: 120, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-3", code: "AB11-103", name: "CSED Block AB-XI Room 103", building: "AB-XI", capacity: 110, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-4", code: "AB11-104", name: "CSED Block AB-XI Room 104", building: "AB-XI", capacity: 110, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-5", code: "AB11-105", name: "CSED Block AB-XI Room 105", building: "AB-XI", capacity: 100, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-6", code: "AB11-201", name: "CSED Block AB-XI Room 201", building: "AB-XI", capacity: 100, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-7", code: "AB11-202", name: "CSED Block AB-XI Room 202", building: "AB-XI", capacity: 100, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-8", code: "AB11-203", name: "CSED Block AB-XI Room 203", building: "AB-XI", capacity: 100, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-9", code: "AB11-204", name: "CSED Block AB-XI Room 204", building: "AB-XI", capacity: 90, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  { id: "room-10", code: "AB11-205", name: "CSED Block AB-XI Room 205", building: "AB-XI", capacity: 90, roomType: "standard", facilities: { projector: true, cctv: true }, isActive: true },
  // 5 Specialized Labs (Total = 440 seats)
  { id: "room-11", code: "AB11-LAB1", name: "CSED Block AB-XI Central Computing Lab", building: "AB-XI", capacity: 100, roomType: "lab", facilities: { workstations: 100, os: "Dual Boot Linux/Win11", lan: "1 Gbps" }, isActive: true },
  { id: "room-12", code: "AB11-LAB2", name: "CSED Block AB-XI Systems Programming Lab", building: "AB-XI", capacity: 90, roomType: "lab", facilities: { workstations: 90, compilers: "GCC, Clang, JDK21" }, isActive: true },
  { id: "room-13", code: "AB11-LAB3", name: "CSED Block AB-XI AI & Data Science Lab", building: "AB-XI", capacity: 90, roomType: "lab", facilities: { workstations: 90, accelerators: "NVIDIA RTX 4070" }, isActive: true },
  { id: "room-14", code: "AB11-LAB4", name: "CSED Block AB-XI Software Engineering Lab", building: "AB-XI", capacity: 80, roomType: "lab", facilities: { workstations: 80, ide: "VS Code, JetBrains Suite" }, isActive: true },
  { id: "room-15", code: "AB11-LAB5", name: "CSED Block AB-XI Advanced Database Lab", building: "AB-XI", capacity: 80, roomType: "lab", facilities: { workstations: 80, dbs: "PostgreSQL, Oracle 19c" }, isActive: true },
];

export const EXAMOPT_TIME_SLOTS: TimeSlotData[] = [
  { id: "slot-1", code: "D1-M", date: "2026-10-19", startTime: "09:30", endTime: "12:30", session: "morning", label: "Day 1 - Morning", isAvailable: true },
  { id: "slot-2", code: "D1-E", date: "2026-10-19", startTime: "14:00", endTime: "17:00", session: "evening", label: "Day 1 - Evening", isAvailable: true },
  { id: "slot-3", code: "D2-M", date: "2026-10-20", startTime: "09:30", endTime: "12:30", session: "morning", label: "Day 2 - Morning", isAvailable: true },
  { id: "slot-4", code: "D2-E", date: "2026-10-20", startTime: "14:00", endTime: "17:00", session: "evening", label: "Day 2 - Evening", isAvailable: true },
  { id: "slot-5", code: "D3-M", date: "2026-10-21", startTime: "09:30", endTime: "12:30", session: "morning", label: "Day 3 - Morning", isAvailable: true },
  { id: "slot-6", code: "D3-E", date: "2026-10-21", startTime: "14:00", endTime: "17:00", session: "evening", label: "Day 3 - Evening", isAvailable: true },
  { id: "slot-7", code: "D4-M", date: "2026-10-22", startTime: "09:30", endTime: "12:30", session: "morning", label: "Day 4 - Morning", isAvailable: true },
  { id: "slot-8", code: "D4-E", date: "2026-10-22", startTime: "14:00", endTime: "17:00", session: "evening", label: "Day 4 - Evening", isAvailable: true },
  { id: "slot-9", code: "D5-M", date: "2026-10-23", startTime: "09:30", endTime: "12:30", session: "morning", label: "Day 5 - Morning", isAvailable: true },
  { id: "slot-10", code: "D5-E", date: "2026-10-23", startTime: "14:00", endTime: "17:00", session: "evening", label: "Day 5 - Evening", isAvailable: true },
];

export const EXAMOPT_SUBJECTS: SubjectData[] = [
  // BCA Semester 1
  { id: "sub-1", code: "BCA-101", name: "Mathematical Foundation of Computer Science", program: "BCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 95, isActive: true },
  { id: "sub-2", code: "BCA-102", name: "Problem Solving with C Programming", program: "BCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 95, isActive: true },
  { id: "sub-3", code: "BCA-103", name: "Digital Logic and Computer Organization", program: "BCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 95, isActive: true },
  { id: "sub-4", code: "BCA-104P", name: "C Programming Laboratory", program: "BCA", semester: 1, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 95, isActive: true },
  // BCA Semester 3
  { id: "sub-5", code: "BCA-301", name: "Data Structures and Algorithms", program: "BCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 88, isActive: true },
  { id: "sub-6", code: "BCA-302", name: "Database Management Systems", program: "BCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 88, isActive: true },
  { id: "sub-7", code: "BCA-303", name: "Object Oriented Programming with Java", program: "BCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 88, isActive: true },
  { id: "sub-8", code: "BCA-304P", name: "Data Structures & Java Lab", program: "BCA", semester: 3, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 88, isActive: true },
  // BCA Data Science (BCA-DS) Semester 1
  { id: "sub-9", code: "BCADS-101", name: "Foundations of Data Science & Statistics", program: "BCA-DS", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 45, isActive: true },
  { id: "sub-10", code: "BCADS-102", name: "Python for Data Analysis", program: "BCA-DS", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 45, isActive: true },
  { id: "sub-11", code: "BCADS-103", name: "Discrete Structures & Linear Algebra", program: "BCA-DS", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 45, isActive: true },
  { id: "sub-12", code: "BCADS-104P", name: "Python & Data Science Computing Lab", program: "BCA-DS", semester: 1, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 45, isActive: true },
  // BCA Data Science (BCA-DS) Semester 3
  { id: "sub-13", code: "BCADS-301", name: "Applied Machine Learning", program: "BCA-DS", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 42, isActive: true },
  { id: "sub-14", code: "BCADS-302", name: "Big Data Technologies", program: "BCA-DS", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 42, isActive: true },
  { id: "sub-15", code: "BCADS-303", name: "Data Visualization and Storytelling", program: "BCA-DS", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 42, isActive: true },
  { id: "sub-16", code: "BCADS-304P", name: "Machine Learning Tools & Spark Lab", program: "BCA-DS", semester: 3, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 42, isActive: true },
  // MCA Semester 1
  { id: "sub-17", code: "MCA-101", name: "Advanced Data Structures & Algorithms", program: "MCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 60, isActive: true },
  { id: "sub-18", code: "MCA-102", name: "Advanced Operating Systems & Cloud", program: "MCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 60, isActive: true },
  { id: "sub-19", code: "MCA-103", name: "Modern Software Engineering & DevOps", program: "MCA", semester: 1, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 60, isActive: true },
  { id: "sub-20", code: "MCA-104P", name: "Advanced Computing Systems Lab", program: "MCA", semester: 1, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 60, isActive: true },
  // MCA Semester 3
  { id: "sub-21", code: "MCA-301", name: "Deep Learning & Neural Networks", program: "MCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 55, isActive: true },
  { id: "sub-22", code: "MCA-302", name: "Distributed Systems & Microservices", program: "MCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 55, isActive: true },
  { id: "sub-23", code: "MCA-303", name: "Enterprise Web Security & Cryptography", program: "MCA", semester: 3, durationMinutes: 180, examType: "theory", requiresLab: false, enrollmentCount: 55, isActive: true },
  { id: "sub-24", code: "MCA-304P", name: "Deep Learning & Security Audit Lab", program: "MCA", semester: 3, durationMinutes: 180, examType: "practical", requiresLab: true, enrollmentCount: 55, isActive: true },
];

export const EXAMOPT_STUDENT_GROUPS: StudentGroupData[] = [
  { id: "grp-1", code: "GRP-BCA-S1", name: "BCA 1st Year - Section A", program: "BCA", semester: 1, strength: 50 },
  { id: "grp-2", code: "GRP-BCA-S2", name: "BCA 1st Year - Section B", program: "BCA", semester: 1, strength: 45 },
  { id: "grp-3", code: "GRP-BCA-DS1", name: "BCA (Data Science) 1st Year", program: "BCA-DS", semester: 1, strength: 45 },
  { id: "grp-4", code: "GRP-BCA-3A", name: "BCA 2nd Year - Section A", program: "BCA", semester: 3, strength: 44 },
  { id: "grp-5", code: "GRP-BCA-3B", name: "BCA 2nd Year - Section B", program: "BCA", semester: 3, strength: 44 },
  { id: "grp-6", code: "GRP-BCADS-3", name: "BCA (Data Science) 2nd Year", program: "BCA-DS", semester: 3, strength: 42 },
  { id: "grp-7", code: "GRP-MCA-S1", name: "MCA 1st Year - Section A", program: "MCA", semester: 1, strength: 60 },
  { id: "grp-8", code: "GRP-MCA-S2", name: "MCA 2nd Year - Section A", program: "MCA", semester: 3, strength: 55 },
];

export const EXAMOPT_FACULTY: FacultyData[] = [
  { id: "fac-1", name: "Prof. Ramesh Chandra", designation: "Professor & Head", department: "Computer Science & Engineering", email: "ramesh.chandra@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-2", name: "Dr. Ananya Sen", designation: "Associate Professor", department: "Computer Applications", email: "ananya.sen@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-3", name: "Dr. Pradeep Sharma", designation: "Associate Professor", department: "Computer Science & Engineering", email: "pradeep.sharma@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-4", name: "Dr. Priya Verma", designation: "Assistant Professor", department: "Data Science & AI", email: "priya.verma@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-5", name: "Dr. Vivek Agrawal", designation: "Associate Professor", department: "Computer Applications", email: "vivek.agrawal@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-6", name: "Dr. Neha Gupta", designation: "Assistant Professor", department: "Information Technology", email: "neha.gupta@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-7", name: "Dr. Saurabh Mishra", designation: "Assistant Professor", department: "Computer Science & Engineering", email: "saurabh.mishra@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-8", name: "Dr. Sunita Rao", designation: "Assistant Professor", department: "Data Science & AI", email: "sunita.rao@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-9", name: "Dr. Amit Tiwari", designation: "Assistant Professor", department: "Computer Applications", email: "amit.tiwari@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-10", name: "Dr. Pooja Pandey", designation: "Assistant Professor", department: "Information Technology", email: "pooja.pandey@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-11", name: "Dr. Rajesh Kumar", designation: "Associate Professor", department: "Computer Science & Engineering", email: "rajesh.kumar@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-12", name: "Dr. Vandana Singh", designation: "Assistant Professor", department: "Computer Applications", email: "vandana.singh@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-13", name: "Dr. Tarun Saxena", designation: "Assistant Professor", department: "Data Science & AI", email: "tarun.saxena@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-14", name: "Dr. Monica Joshi", designation: "Assistant Professor", department: "Computer Science & Engineering", email: "monica.joshi@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-15", name: "Dr. Alok Tripathi", designation: "Assistant Professor", department: "Computer Applications", email: "alok.tripathi@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-16", name: "Dr. Shalini Dubey", designation: "Assistant Professor", department: "Information Technology", email: "shalini.dubey@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-17", name: "Dr. Mohit Bansal", designation: "Assistant Professor", department: "Computer Science & Engineering", email: "mohit.bansal@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-18", name: "Dr. Ritu Srivastava", designation: "Assistant Professor", department: "Data Science & AI", email: "ritu.srivastava@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
  { id: "fac-19", name: "Dr. Deepak Jaiswal", designation: "Assistant Professor", department: "Computer Applications", email: "deepak.jaiswal@gla.ac.in", maxInvigilations: 5, assignedCount: 3 },
  { id: "fac-20", name: "Dr. Archana Kaushik", designation: "Assistant Professor", department: "Computer Science & Engineering", email: "archana.kaushik@gla.ac.in", maxInvigilations: 4, assignedCount: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITHM BENCHMARK RESULTS (FROM PAYLOAD)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAMOPT_ALGORITHM_BENCHMARKS: AlgorithmBenchmark[] = [
  {
    algorithm: "FIRST_FIT",
    name: "First-Fit Greedy Heuristic",
    status: "FEASIBLE",
    is_feasible: true,
    scheduled_exams: 24,
    unscheduled_exams: 0,
    hard_conflicts: 0,
    slots_used: 6,
    room_utilization_pct: 86.75,
    unused_capacity_seats: 265,
    execution_time_ms: 0.32,
    soft_score: 76.70,
  },
  {
    algorithm: "WELSH_POWELL",
    name: "Welsh-Powell Graph Coloring",
    status: "FEASIBLE",
    is_feasible: true,
    scheduled_exams: 24,
    unscheduled_exams: 0,
    hard_conflicts: 0,
    slots_used: 6,
    room_utilization_pct: 87.63,
    unused_capacity_seats: 245,
    execution_time_ms: 0.34,
    soft_score: 77.05,
    isRecommended: true,
  },
  {
    algorithm: "BACKTRACKING",
    name: "Constraint Satisfaction (Backtracking with Forward Checking)",
    status: "FEASIBLE",
    is_feasible: true,
    scheduled_exams: 24,
    unscheduled_exams: 0,
    hard_conflicts: 0,
    slots_used: 6,
    room_utilization_pct: 87.19,
    unused_capacity_seats: 255,
    execution_time_ms: 0.41,
    soft_score: 76.88,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASE VALIDATION SUITE (FROM PAYLOAD)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAMOPT_EDGE_CASE_RESULTS: Record<string, EdgeCaseResult> = {
  edge_case_lab_bottleneck: {
    status: "VALIDATION_FAILED",
    is_valid: false,
    readiness_score: 0,
    detected_error: "LAB_BOTTLENECK",
    message: "Lab Bottleneck in slot 'D1-M': 6 lab examinations are locked to slot 'D1-M', but campus only has 5 specialized labs.",
    remediation: "Relax fixed-slot constraint on at least one practical exam (e.g. reschedule BCA-104P to Day 2 slot D2-E).",
  },
  edge_case_capacity_overflow: {
    status: "VALIDATION_FAILED",
    is_valid: false,
    readiness_score: 0,
    detected_error: "CAPACITY_OVERFLOW",
    message: "Subject 'BCA-101' enrollment (650) exceeds the capacity of the largest Theory room (150). Requires room splitting or reallocation.",
    remediation: "Partition the candidate examination into multi-room cohorts (e.g. Room 101, 102, 103) or split morning/evening sessions.",
  },
  invalid_corrupted_input: {
    status: "VALIDATION_FAILED",
    is_valid: false,
    readiness_score: 0,
    detected_errors_count: 6,
    error_codes: [
      "DUPLICATE_SUBJECT_ID",
      "NEGATIVE_ENROLLMENT",
      "CONTRADICTORY_CONSTRAINTS",
      "FOREIGN_KEY_NOT_FOUND",
      "MISSING_NAME",
      "INVALID_PROGRAM",
    ],
    remediation: "Sanitize tabular CSV imports through Zod schema validation pipe before ingestion into PostgreSQL.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT LOOKUP DIRECTORY (FROM PAYLOAD & ENROLLMENT DATABASE)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAMOPT_STUDENT_LOOKUP_REGISTRY: Record<string, StudentLookupData> = {
  "GLA26-BCA-0001": {
    roll_no: "GLA26-BCA-0001",
    student_name: "Aarav Sharma",
    group_id: "GRP-BCA-S1",
    program: "BCA (Bachelor of Computer Applications)",
    enrolled_exams_count: 4,
    schedule: [
      {
        subject_id: "BCA-101",
        subject_name: "Mathematical Foundation of Computer Science",
        exam_date: "2026-10-19",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D1-M",
        room_id: "AB11-101",
        room_name: "CSED Block AB-XI Room 101",
      },
      {
        subject_id: "BCA-102",
        subject_name: "Problem Solving with C Programming",
        exam_date: "2026-10-19",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D1-E",
        room_id: "AB11-101",
        room_name: "CSED Block AB-XI Room 101",
      },
      {
        subject_id: "BCA-103",
        subject_name: "Digital Logic and Computer Organization",
        exam_date: "2026-10-20",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D2-M",
        room_id: "AB11-101",
        room_name: "CSED Block AB-XI Room 101",
      },
      {
        subject_id: "BCA-104P",
        subject_name: "C Programming Laboratory",
        exam_date: "2026-10-20",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D2-E",
        room_id: "AB11-LAB1",
        room_name: "CSED Block AB-XI Central Computing Lab",
      },
    ],
  },
  "GLA26-MCA-0012": {
    roll_no: "GLA26-MCA-0012",
    student_name: "Tanvi Saxena",
    group_id: "GRP-MCA-S1",
    program: "MCA (Master of Computer Applications)",
    enrolled_exams_count: 4,
    schedule: [
      {
        subject_id: "MCA-101",
        subject_name: "Advanced Data Structures & Algorithms",
        exam_date: "2026-10-19",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D1-M",
        room_id: "AB11-103",
        room_name: "CSED Block AB-XI Room 103",
      },
      {
        subject_id: "MCA-102",
        subject_name: "Advanced Operating Systems & Cloud",
        exam_date: "2026-10-19",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D1-E",
        room_id: "AB11-103",
        room_name: "CSED Block AB-XI Room 103",
      },
      {
        subject_id: "MCA-103",
        subject_name: "Modern Software Engineering & DevOps",
        exam_date: "2026-10-21",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D3-M",
        room_id: "AB11-103",
        room_name: "CSED Block AB-XI Room 103",
      },
      {
        subject_id: "MCA-104P",
        subject_name: "Advanced Computing Systems Lab",
        exam_date: "2026-10-21",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D3-E",
        room_id: "AB11-LAB2",
        room_name: "CSED Block AB-XI Systems Programming Lab",
      },
    ],
  },
  "GLA26-BCADS-0005": {
    roll_no: "GLA26-BCADS-0005",
    student_name: "Kabir Mehta",
    group_id: "GRP-BCA-DS1",
    program: "BCA (Data Science)",
    enrolled_exams_count: 4,
    schedule: [
      {
        subject_id: "BCADS-101",
        subject_name: "Foundations of Data Science & Statistics",
        exam_date: "2026-10-19",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D1-M",
        room_id: "AB11-104",
        room_name: "CSED Block AB-XI Room 104",
      },
      {
        subject_id: "BCADS-102",
        subject_name: "Python for Data Analysis",
        exam_date: "2026-10-19",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D1-E",
        room_id: "AB11-104",
        room_name: "CSED Block AB-XI Room 104",
      },
      {
        subject_id: "BCADS-103",
        subject_name: "Discrete Structures & Linear Algebra",
        exam_date: "2026-10-20",
        session: "MORNING",
        time_range: "09:30 AM - 12:30 PM",
        slot_id: "D2-M",
        room_id: "AB11-104",
        room_name: "CSED Block AB-XI Room 104",
      },
      {
        subject_id: "BCADS-104P",
        subject_name: "Python & Data Science Computing Lab",
        exam_date: "2026-10-20",
        session: "EVENING",
        time_range: "02:00 PM - 05:00 PM",
        slot_id: "D2-E",
        room_id: "AB11-LAB3",
        room_name: "CSED Block AB-XI AI & Data Science Lab",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL FEASIBLE SCHEDULE MATRIX (OPTIMIZED BY WELSH-POWELL WITH 0 CONFLICTS)
// ─────────────────────────────────────────────────────────────────────────────

export interface TimetableAllocation {
  id: string;
  subjectCode: string;
  subjectName: string;
  program: string;
  semester: number;
  slotCode: string;
  slotLabel: string;
  date: string;
  session: string;
  timeRange: string;
  roomCode: string;
  roomName: string;
  roomType: "standard" | "lab";
  enrolledStudents: number;
  roomCapacity: number;
  fillPct: number;
  invigilator: string;
  isBacklogFriendly: boolean;
}

export const EXAMOPT_FEASIBLE_TIMETABLE: TimetableAllocation[] = [
  // Day 1 Morning (D1-M)
  {
    id: "alloc-1",
    subjectCode: "BCA-101",
    subjectName: "Mathematical Foundation of Computer Science",
    program: "BCA",
    semester: 1,
    slotCode: "D1-M",
    slotLabel: "Day 1 - Morning",
    date: "2026-10-19",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-101",
    roomName: "CSED Block AB-XI Room 101",
    roomType: "standard",
    enrolledStudents: 95,
    roomCapacity: 120,
    fillPct: 79.17,
    invigilator: "Dr. Ananya Sen",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-2",
    subjectCode: "BCADS-101",
    subjectName: "Foundations of Data Science & Statistics",
    program: "BCA-DS",
    semester: 1,
    slotCode: "D1-M",
    slotLabel: "Day 1 - Morning",
    date: "2026-10-19",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-104",
    roomName: "CSED Block AB-XI Room 104",
    roomType: "standard",
    enrolledStudents: 45,
    roomCapacity: 110,
    fillPct: 40.91,
    invigilator: "Dr. Priya Verma",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-3",
    subjectCode: "MCA-101",
    subjectName: "Advanced Data Structures & Algorithms",
    program: "MCA",
    semester: 1,
    slotCode: "D1-M",
    slotLabel: "Day 1 - Morning",
    date: "2026-10-19",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-103",
    roomName: "CSED Block AB-XI Room 103",
    roomType: "standard",
    enrolledStudents: 60,
    roomCapacity: 110,
    fillPct: 54.55,
    invigilator: "Prof. Ramesh Chandra",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-4",
    subjectCode: "BCA-301",
    subjectName: "Data Structures and Algorithms",
    program: "BCA",
    semester: 3,
    slotCode: "D1-M",
    slotLabel: "Day 1 - Morning",
    date: "2026-10-19",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-102",
    roomName: "CSED Block AB-XI Room 102",
    roomType: "standard",
    enrolledStudents: 88,
    roomCapacity: 120,
    fillPct: 73.33,
    invigilator: "Dr. Pradeep Sharma",
    isBacklogFriendly: true,
  },

  // Day 1 Evening (D1-E)
  {
    id: "alloc-5",
    subjectCode: "BCA-102",
    subjectName: "Problem Solving with C Programming",
    program: "BCA",
    semester: 1,
    slotCode: "D1-E",
    slotLabel: "Day 1 - Evening",
    date: "2026-10-19",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-101",
    roomName: "CSED Block AB-XI Room 101",
    roomType: "standard",
    enrolledStudents: 95,
    roomCapacity: 120,
    fillPct: 79.17,
    invigilator: "Dr. Vivek Agrawal",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-6",
    subjectCode: "BCADS-102",
    subjectName: "Python for Data Analysis",
    program: "BCA-DS",
    semester: 1,
    slotCode: "D1-E",
    slotLabel: "Day 1 - Evening",
    date: "2026-10-19",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-104",
    roomName: "CSED Block AB-XI Room 104",
    roomType: "standard",
    enrolledStudents: 45,
    roomCapacity: 110,
    fillPct: 40.91,
    invigilator: "Dr. Neha Gupta",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-7",
    subjectCode: "MCA-102",
    subjectName: "Advanced Operating Systems & Cloud",
    program: "MCA",
    semester: 1,
    slotCode: "D1-E",
    slotLabel: "Day 1 - Evening",
    date: "2026-10-19",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-103",
    roomName: "CSED Block AB-XI Room 103",
    roomType: "standard",
    enrolledStudents: 60,
    roomCapacity: 110,
    fillPct: 54.55,
    invigilator: "Dr. Saurabh Mishra",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-8",
    subjectCode: "BCADS-301",
    subjectName: "Applied Machine Learning",
    program: "BCA-DS",
    semester: 3,
    slotCode: "D1-E",
    slotLabel: "Day 1 - Evening",
    date: "2026-10-19",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-105",
    roomName: "CSED Block AB-XI Room 105",
    roomType: "standard",
    enrolledStudents: 42,
    roomCapacity: 100,
    fillPct: 42.0,
    invigilator: "Dr. Sunita Rao",
    isBacklogFriendly: true,
  },

  // Day 2 Morning (D2-M)
  {
    id: "alloc-9",
    subjectCode: "BCA-103",
    subjectName: "Digital Logic and Computer Organization",
    program: "BCA",
    semester: 1,
    slotCode: "D2-M",
    slotLabel: "Day 2 - Morning",
    date: "2026-10-20",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-101",
    roomName: "CSED Block AB-XI Room 101",
    roomType: "standard",
    enrolledStudents: 95,
    roomCapacity: 120,
    fillPct: 79.17,
    invigilator: "Dr. Amit Tiwari",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-10",
    subjectCode: "BCADS-103",
    subjectName: "Discrete Structures & Linear Algebra",
    program: "BCA-DS",
    semester: 1,
    slotCode: "D2-M",
    slotLabel: "Day 2 - Morning",
    date: "2026-10-20",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-104",
    roomName: "CSED Block AB-XI Room 104",
    roomType: "standard",
    enrolledStudents: 45,
    roomCapacity: 110,
    fillPct: 40.91,
    invigilator: "Dr. Pooja Pandey",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-11",
    subjectCode: "BCA-302",
    subjectName: "Database Management Systems",
    program: "BCA",
    semester: 3,
    slotCode: "D2-M",
    slotLabel: "Day 2 - Morning",
    date: "2026-10-20",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-102",
    roomName: "CSED Block AB-XI Room 102",
    roomType: "standard",
    enrolledStudents: 88,
    roomCapacity: 120,
    fillPct: 73.33,
    invigilator: "Dr. Rajesh Kumar",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-12",
    subjectCode: "MCA-301",
    subjectName: "Deep Learning & Neural Networks",
    program: "MCA",
    semester: 3,
    slotCode: "D2-M",
    slotLabel: "Day 2 - Morning",
    date: "2026-10-20",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-201",
    roomName: "CSED Block AB-XI Room 201",
    roomType: "standard",
    enrolledStudents: 55,
    roomCapacity: 100,
    fillPct: 55.0,
    invigilator: "Dr. Vandana Singh",
    isBacklogFriendly: true,
  },

  // Day 2 Evening (D2-E) - Practical Labs
  {
    id: "alloc-13",
    subjectCode: "BCA-104P",
    subjectName: "C Programming Laboratory",
    program: "BCA",
    semester: 1,
    slotCode: "D2-E",
    slotLabel: "Day 2 - Evening",
    date: "2026-10-20",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB1",
    roomName: "CSED Block AB-XI Central Computing Lab",
    roomType: "lab",
    enrolledStudents: 95,
    roomCapacity: 100,
    fillPct: 95.0,
    invigilator: "Dr. Tarun Saxena",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-14",
    subjectCode: "BCADS-104P",
    subjectName: "Python & Data Science Computing Lab",
    program: "BCA-DS",
    semester: 1,
    slotCode: "D2-E",
    slotLabel: "Day 2 - Evening",
    date: "2026-10-20",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB3",
    roomName: "CSED Block AB-XI AI & Data Science Lab",
    roomType: "lab",
    enrolledStudents: 45,
    roomCapacity: 90,
    fillPct: 50.0,
    invigilator: "Dr. Monica Joshi",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-15",
    subjectCode: "BCADS-302",
    subjectName: "Big Data Technologies",
    program: "BCA-DS",
    semester: 3,
    slotCode: "D2-E",
    slotLabel: "Day 2 - Evening",
    date: "2026-10-20",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-202",
    roomName: "CSED Block AB-XI Room 202",
    roomType: "standard",
    enrolledStudents: 42,
    roomCapacity: 100,
    fillPct: 42.0,
    invigilator: "Dr. Alok Tripathi",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-16",
    subjectCode: "MCA-302",
    subjectName: "Distributed Systems & Microservices",
    program: "MCA",
    semester: 3,
    slotCode: "D2-E",
    slotLabel: "Day 2 - Evening",
    date: "2026-10-20",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-203",
    roomName: "CSED Block AB-XI Room 203",
    roomType: "standard",
    enrolledStudents: 55,
    roomCapacity: 100,
    fillPct: 55.0,
    invigilator: "Dr. Shalini Dubey",
    isBacklogFriendly: true,
  },

  // Day 3 Morning (D3-M)
  {
    id: "alloc-17",
    subjectCode: "BCA-303",
    subjectName: "Object Oriented Programming with Java",
    program: "BCA",
    semester: 3,
    slotCode: "D3-M",
    slotLabel: "Day 3 - Morning",
    date: "2026-10-21",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-102",
    roomName: "CSED Block AB-XI Room 102",
    roomType: "standard",
    enrolledStudents: 88,
    roomCapacity: 120,
    fillPct: 73.33,
    invigilator: "Dr. Mohit Bansal",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-18",
    subjectCode: "BCADS-303",
    subjectName: "Data Visualization and Storytelling",
    program: "BCA-DS",
    semester: 3,
    slotCode: "D3-M",
    slotLabel: "Day 3 - Morning",
    date: "2026-10-21",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-105",
    roomName: "CSED Block AB-XI Room 105",
    roomType: "standard",
    enrolledStudents: 42,
    roomCapacity: 100,
    fillPct: 42.0,
    invigilator: "Dr. Ritu Srivastava",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-19",
    subjectCode: "MCA-103",
    subjectName: "Modern Software Engineering & DevOps",
    program: "MCA",
    semester: 1,
    slotCode: "D3-M",
    slotLabel: "Day 3 - Morning",
    date: "2026-10-21",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-103",
    roomName: "CSED Block AB-XI Room 103",
    roomType: "standard",
    enrolledStudents: 60,
    roomCapacity: 110,
    fillPct: 54.55,
    invigilator: "Dr. Deepak Jaiswal",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-20",
    subjectCode: "MCA-303",
    subjectName: "Enterprise Web Security & Cryptography",
    program: "MCA",
    semester: 3,
    slotCode: "D3-M",
    slotLabel: "Day 3 - Morning",
    date: "2026-10-21",
    session: "MORNING",
    timeRange: "09:30 AM - 12:30 PM",
    roomCode: "AB11-201",
    roomName: "CSED Block AB-XI Room 201",
    roomType: "standard",
    enrolledStudents: 55,
    roomCapacity: 100,
    fillPct: 55.0,
    invigilator: "Dr. Archana Kaushik",
    isBacklogFriendly: true,
  },

  // Day 3 Evening (D3-E) - Advanced Practical Labs
  {
    id: "alloc-21",
    subjectCode: "BCA-304P",
    subjectName: "Data Structures & Java Lab",
    program: "BCA",
    semester: 3,
    slotCode: "D3-E",
    slotLabel: "Day 3 - Evening",
    date: "2026-10-21",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB1",
    roomName: "CSED Block AB-XI Central Computing Lab",
    roomType: "lab",
    enrolledStudents: 88,
    roomCapacity: 100,
    fillPct: 88.0,
    invigilator: "Prof. Ramesh Chandra",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-22",
    subjectCode: "BCADS-304P",
    subjectName: "Machine Learning Tools & Spark Lab",
    program: "BCA-DS",
    semester: 3,
    slotCode: "D3-E",
    slotLabel: "Day 3 - Evening",
    date: "2026-10-21",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB3",
    roomName: "CSED Block AB-XI AI & Data Science Lab",
    roomType: "lab",
    enrolledStudents: 42,
    roomCapacity: 90,
    fillPct: 46.67,
    invigilator: "Dr. Priya Verma",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-23",
    subjectCode: "MCA-104P",
    subjectName: "Advanced Computing Systems Lab",
    program: "MCA",
    semester: 1,
    slotCode: "D3-E",
    slotLabel: "Day 3 - Evening",
    date: "2026-10-21",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB2",
    roomName: "CSED Block AB-XI Systems Programming Lab",
    roomType: "lab",
    enrolledStudents: 60,
    roomCapacity: 90,
    fillPct: 66.67,
    invigilator: "Dr. Saurabh Mishra",
    isBacklogFriendly: true,
  },
  {
    id: "alloc-24",
    subjectCode: "MCA-304P",
    subjectName: "Deep Learning & Security Audit Lab",
    program: "MCA",
    semester: 3,
    slotCode: "D3-E",
    slotLabel: "Day 3 - Evening",
    date: "2026-10-21",
    session: "EVENING",
    timeRange: "02:00 PM - 05:00 PM",
    roomCode: "AB11-LAB5",
    roomName: "CSED Block AB-XI Advanced Database Lab",
    roomType: "lab",
    enrolledStudents: 55,
    roomCapacity: 80,
    fillPct: 68.75,
    invigilator: "Dr. Sunita Rao",
    isBacklogFriendly: true,
  },
];
