-- =============================================================================
-- ExamOpt Studio — Live Cloud Seed Data (GLA HackVision 2.0 - Problem C10)
-- Target: Supabase Project (tvyiqyngqehrxrcxqwei)
-- Dataset: CSED Block AB-XI, GLA University Mathura
-- =============================================================================

-- 1. Insert 15 Examination Rooms & Specialized Labs (1,480 Seats Total)
-- -----------------------------------------------------------------------------
INSERT INTO public.exam_rooms (id, code, name, building, capacity, room_type, facilities, is_active)
VALUES
  -- 10 Theory Lecture Halls (1,040 seats)
  ('room-1', 'AB11-101', 'CSED Block AB-XI Room 101', 'AB-XI', 120, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-2', 'AB11-102', 'CSED Block AB-XI Room 102', 'AB-XI', 120, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-3', 'AB11-103', 'CSED Block AB-XI Room 103', 'AB-XI', 110, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-4', 'AB11-104', 'CSED Block AB-XI Room 104', 'AB-XI', 110, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-5', 'AB11-105', 'CSED Block AB-XI Room 105', 'AB-XI', 100, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-6', 'AB11-201', 'CSED Block AB-XI Room 201', 'AB-XI', 100, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-7', 'AB11-202', 'CSED Block AB-XI Room 202', 'AB-XI', 100, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-8', 'AB11-203', 'CSED Block AB-XI Room 203', 'AB-XI', 100, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-9', 'AB11-204', 'CSED Block AB-XI Room 204', 'AB-XI', 90, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  ('room-10', 'AB11-205', 'CSED Block AB-XI Room 205', 'AB-XI', 90, 'standard', '{"projector": true, "cctv": true}'::jsonb, true),
  -- 5 Specialized Computer Labs (440 seats)
  ('room-11', 'AB11-LAB1', 'CSED Block AB-XI Central Computing Lab', 'AB-XI', 100, 'lab', '{"workstations": 100, "os": "Dual Boot Linux/Win11"}'::jsonb, true),
  ('room-12', 'AB11-LAB2', 'CSED Block AB-XI Systems Programming Lab', 'AB-XI', 90, 'lab', '{"workstations": 90, "compilers": "GCC, Clang, JDK21"}'::jsonb, true),
  ('room-13', 'AB11-LAB3', 'CSED Block AB-XI AI & Data Science Lab', 'AB-XI', 90, 'lab', '{"workstations": 90, "accelerators": "NVIDIA RTX 4070"}'::jsonb, true),
  ('room-14', 'AB11-LAB4', 'CSED Block AB-XI Software Engineering Lab', 'AB-XI', 80, 'lab', '{"workstations": 80, "ide": "VS Code, JetBrains Suite"}'::jsonb, true),
  ('room-15', 'AB11-LAB5', 'CSED Block AB-XI Advanced Database Lab', 'AB-XI', 80, 'lab', '{"workstations": 80, "dbs": "PostgreSQL, Oracle 19c"}'::jsonb, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  room_type = EXCLUDED.room_type,
  facilities = EXCLUDED.facilities,
  is_active = EXCLUDED.is_active;

-- 2. Insert 10 Examination Time Slots (D1-M to D5-E)
-- -----------------------------------------------------------------------------
INSERT INTO public.time_slots (id, date, start_time, end_time, session, label, is_available)
VALUES
  ('slot-1', '2026-10-19', '09:30', '12:30', 'morning', 'Day 1 - Morning (D1-M)', true),
  ('slot-2', '2026-10-19', '14:00', '17:00', 'evening', 'Day 1 - Evening (D1-E)', true),
  ('slot-3', '2026-10-20', '09:30', '12:30', 'morning', 'Day 2 - Morning (D2-M)', true),
  ('slot-4', '2026-10-20', '14:00', '17:00', 'evening', 'Day 2 - Evening (D2-E)', true),
  ('slot-5', '2026-10-21', '09:30', '12:30', 'morning', 'Day 3 - Morning (D3-M)', true),
  ('slot-6', '2026-10-21', '14:00', '17:00', 'evening', 'Day 3 - Evening (D3-E)', true),
  ('slot-7', '2026-10-22', '09:30', '12:30', 'morning', 'Day 4 - Morning (D4-M)', true),
  ('slot-8', '2026-10-22', '14:00', '17:00', 'evening', 'Day 4 - Evening (D4-E)', true),
  ('slot-9', '2026-10-23', '09:30', '12:30', 'morning', 'Day 5 - Morning (D5-M)', true),
  ('slot-10', '2026-10-23', '14:00', '17:00', 'evening', 'Day 5 - Evening (D5-E)', true)
ON CONFLICT (date, start_time, session) DO UPDATE SET
  end_time = EXCLUDED.end_time,
  label = EXCLUDED.label,
  is_available = EXCLUDED.is_available;

-- 3. Insert 24 Courses (BCA, BCA-DS, MCA)
-- -----------------------------------------------------------------------------
INSERT INTO public.subjects (id, code, name, program, semester, duration_minutes, exam_type, requires_lab, is_active)
VALUES
  -- BCA Semester 1
  ('sub-1', 'BCA-101', 'Mathematical Foundation of Computer Science', 'BCA', 1, 180, 'theory', false, true),
  ('sub-2', 'BCA-102', 'Problem Solving with C Programming', 'BCA', 1, 180, 'theory', false, true),
  ('sub-3', 'BCA-103', 'Digital Logic and Computer Organization', 'BCA', 1, 180, 'theory', false, true),
  ('sub-4', 'BCA-104P', 'C Programming Laboratory', 'BCA', 1, 180, 'practical', true, true),
  -- BCA Semester 3
  ('sub-5', 'BCA-301', 'Data Structures and Algorithms', 'BCA', 3, 180, 'theory', false, true),
  ('sub-6', 'BCA-302', 'Database Management Systems', 'BCA', 3, 180, 'theory', false, true),
  ('sub-7', 'BCA-303', 'Object Oriented Programming with Java', 'BCA', 3, 180, 'theory', false, true),
  ('sub-8', 'BCA-304P', 'Data Structures & Java Lab', 'BCA', 3, 180, 'practical', true, true),
  -- BCA-DS Semester 1
  ('sub-9', 'BCADS-101', 'Foundations of Data Science & Statistics', 'BCA-DS', 1, 180, 'theory', false, true),
  ('sub-10', 'BCADS-102', 'Python for Data Analysis', 'BCA-DS', 1, 180, 'theory', false, true),
  ('sub-11', 'BCADS-103', 'Discrete Structures & Linear Algebra', 'BCA-DS', 1, 180, 'theory', false, true),
  ('sub-12', 'BCADS-104P', 'Python & Data Science Computing Lab', 'BCA-DS', 1, 180, 'practical', true, true),
  -- BCA-DS Semester 3
  ('sub-13', 'BCADS-301', 'Applied Machine Learning', 'BCA-DS', 3, 180, 'theory', false, true),
  ('sub-14', 'BCADS-302', 'Big Data Technologies', 'BCA-DS', 3, 180, 'theory', false, true),
  ('sub-15', 'BCADS-303', 'Data Visualization and Storytelling', 'BCA-DS', 3, 180, 'theory', false, true),
  ('sub-16', 'BCADS-304P', 'Machine Learning Tools & Spark Lab', 'BCA-DS', 3, 180, 'practical', true, true),
  -- MCA Semester 1
  ('sub-17', 'MCA-101', 'Advanced Data Structures & Algorithms', 'MCA', 1, 180, 'theory', false, true),
  ('sub-18', 'MCA-102', 'Advanced Operating Systems & Cloud', 'MCA', 1, 180, 'theory', false, true),
  ('sub-19', 'MCA-103', 'Modern Software Engineering & DevOps', 'MCA', 1, 180, 'theory', false, true),
  ('sub-20', 'MCA-104P', 'Advanced Computing Systems Lab', 'MCA', 1, 180, 'practical', true, true),
  -- MCA Semester 3
  ('sub-21', 'MCA-301', 'Deep Learning & Neural Networks', 'MCA', 3, 180, 'theory', false, true),
  ('sub-22', 'MCA-302', 'Distributed Systems & Microservices', 'MCA', 3, 180, 'theory', false, true),
  ('sub-23', 'MCA-303', 'Enterprise Web Security & Cryptography', 'MCA', 3, 180, 'theory', false, true),
  ('sub-24', 'MCA-304P', 'Deep Learning & Security Audit Lab', 'MCA', 3, 180, 'practical', true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  program = EXCLUDED.program,
  semester = EXCLUDED.semester,
  duration_minutes = EXCLUDED.duration_minutes,
  exam_type = EXCLUDED.exam_type,
  requires_lab = EXCLUDED.requires_lab,
  is_active = EXCLUDED.is_active;

-- 4. Insert 8 Student Groups
-- -----------------------------------------------------------------------------
INSERT INTO public.student_groups (id, code, name, program, semester, strength)
VALUES
  ('grp-1', 'GRP-BCA-S1', 'BCA 1st Year - Section A', 'BCA', 1, 50),
  ('grp-2', 'GRP-BCA-S2', 'BCA 1st Year - Section B', 'BCA', 1, 45),
  ('grp-3', 'GRP-BCA-DS1', 'BCA (Data Science) 1st Year', 'BCA-DS', 1, 45),
  ('grp-4', 'GRP-BCA-3A', 'BCA 2nd Year - Section A', 'BCA', 3, 44),
  ('grp-5', 'GRP-BCA-3B', 'BCA 2nd Year - Section B', 'BCA', 3, 44),
  ('grp-6', 'GRP-BCADS-3', 'BCA (Data Science) 2nd Year', 'BCA-DS', 3, 42),
  ('grp-7', 'GRP-MCA-S1', 'MCA 1st Year - Section A', 'MCA', 1, 60),
  ('grp-8', 'GRP-MCA-S2', 'MCA 2nd Year - Section A', 'MCA', 3, 55)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  program = EXCLUDED.program,
  semester = EXCLUDED.semester,
  strength = EXCLUDED.strength;

-- 5. Insert Sample Student Directory (Demonstrating Roll Lookup)
-- -----------------------------------------------------------------------------
INSERT INTO public.students (id, roll_number, name, email, group_id, program, semester, is_active)
VALUES
  ('stu-1', 'GLA26-BCA-0001', 'Aarav Sharma', 'aarav.sharma@gla.ac.in', 'grp-1', 'BCA', 1, true),
  ('stu-2', 'GLA26-BCA-0002', 'Diya Patel', 'diya.patel@gla.ac.in', 'grp-1', 'BCA', 1, true),
  ('stu-3', 'GLA26-BCA-0003', 'Rohan Verma', 'rohan.verma@gla.ac.in', 'grp-1', 'BCA', 1, true),
  ('stu-4', 'GLA26-BCADS-0001', 'Meera Nair', 'meera.nair@gla.ac.in', 'grp-3', 'BCA-DS', 1, true),
  ('stu-5', 'GLA26-BCADS-0005', 'Kabir Mehta', 'kabir.mehta@gla.ac.in', 'grp-3', 'BCA-DS', 1, true),
  ('stu-6', 'GLA26-BCA-3001', 'Aditya Roy', 'aditya.roy@gla.ac.in', 'grp-4', 'BCA', 3, true),
  ('stu-7', 'GLA26-MCA-0001', 'Pooja Mishra', 'pooja.mishra@gla.ac.in', 'grp-7', 'MCA', 1, true),
  ('stu-8', 'GLA26-MCA-0012', 'Tanvi Saxena', 'tanvi.saxena@gla.ac.in', 'grp-7', 'MCA', 1, true),
  ('stu-9', 'GLA26-MCA-3001', 'Vikram Malhotra', 'vikram.malhotra@gla.ac.in', 'grp-8', 'MCA', 3, true)
ON CONFLICT (roll_number) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  group_id = EXCLUDED.group_id,
  program = EXCLUDED.program,
  semester = EXCLUDED.semester;

-- 6. Insert Student Enrollments (Including Backlog Records)
-- -----------------------------------------------------------------------------
INSERT INTO public.enrollments (student_id, subject_id, is_backlog)
VALUES
  -- Aarav Sharma (BCA Sem 1: 4 subjects)
  ('stu-1', 'sub-1', false),
  ('stu-1', 'sub-2', false),
  ('stu-1', 'sub-3', false),
  ('stu-1', 'sub-4', false),
  -- Rohan Verma (BCA Sem 1 + Backlog in sub-1)
  ('stu-3', 'sub-1', true),
  ('stu-3', 'sub-2', false),
  ('stu-3', 'sub-3', false),
  ('stu-3', 'sub-4', false),
  -- Kabir Mehta (BCA-DS Sem 1)
  ('stu-5', 'sub-9', false),
  ('stu-5', 'sub-10', false),
  ('stu-5', 'sub-11', false),
  ('stu-5', 'sub-12', false),
  -- Tanvi Saxena (MCA Sem 1)
  ('stu-8', 'sub-17', false),
  ('stu-8', 'sub-18', false),
  ('stu-8', 'sub-19', false),
  ('stu-8', 'sub-20', false)
ON CONFLICT (student_id, subject_id) DO UPDATE SET
  is_backlog = EXCLUDED.is_backlog;

-- 7. Insert Published Welsh-Powell Schedule Run
-- -----------------------------------------------------------------------------
INSERT INTO public.schedule_runs (
  id, name, algorithm_name, status, dataset_version,
  quality_score, parameters, result, started_at, completed_at, published_at
)
VALUES (
  'run-gla-v2-opt',
  'GLA Autumn 2026 Welsh-Powell Optimal Timetable',
  'Welsh-Powell Graph Coloring',
  'published',
  'normal_gla_dataset',
  77.05,
  '{"room_utilization_pct": 87.63, "slots_used": 6, "hard_conflicts": 0, "unused_capacity_seats": 245}'::jsonb,
  '[
    {"subject": "BCA-101", "slot": "D1-M", "room": "AB11-101", "enrolled": 95, "capacity": 120},
    {"subject": "BCADS-101", "slot": "D1-M", "room": "AB11-104", "enrolled": 45, "capacity": 110},
    {"subject": "MCA-101", "slot": "D1-M", "room": "AB11-103", "enrolled": 60, "capacity": 110},
    {"subject": "BCA-301", "slot": "D1-M", "room": "AB11-102", "enrolled": 88, "capacity": 120},
    {"subject": "BCA-102", "slot": "D1-E", "room": "AB11-101", "enrolled": 95, "capacity": 120},
    {"subject": "BCADS-102", "slot": "D1-E", "room": "AB11-104", "enrolled": 45, "capacity": 110},
    {"subject": "MCA-102", "slot": "D1-E", "room": "AB11-103", "enrolled": 60, "capacity": 110},
    {"subject": "BCADS-301", "slot": "D1-E", "room": "AB11-105", "enrolled": 42, "capacity": 100},
    {"subject": "BCA-103", "slot": "D2-M", "room": "AB11-101", "enrolled": 95, "capacity": 120},
    {"subject": "BCADS-103", "slot": "D2-M", "room": "AB11-104", "enrolled": 45, "capacity": 110},
    {"subject": "BCA-302", "slot": "D2-M", "room": "AB11-102", "enrolled": 88, "capacity": 120},
    {"subject": "MCA-301", "slot": "D2-M", "room": "AB11-201", "enrolled": 55, "capacity": 100},
    {"subject": "BCA-104P", "slot": "D2-E", "room": "AB11-LAB1", "enrolled": 95, "capacity": 100},
    {"subject": "BCADS-104P", "slot": "D2-E", "room": "AB11-LAB3", "enrolled": 45, "capacity": 90},
    {"subject": "BCADS-302", "slot": "D2-E", "room": "AB11-202", "enrolled": 42, "capacity": 100},
    {"subject": "MCA-302", "slot": "D2-E", "room": "AB11-203", "enrolled": 55, "capacity": 100},
    {"subject": "BCA-303", "slot": "D3-M", "room": "AB11-102", "enrolled": 88, "capacity": 120},
    {"subject": "BCADS-303", "slot": "D3-M", "room": "AB11-105", "enrolled": 42, "capacity": 100},
    {"subject": "MCA-103", "slot": "D3-M", "room": "AB11-103", "enrolled": 60, "capacity": 110},
    {"subject": "MCA-303", "slot": "D3-M", "room": "AB11-201", "enrolled": 55, "capacity": 100},
    {"subject": "BCA-304P", "slot": "D3-E", "room": "AB11-LAB1", "enrolled": 88, "capacity": 100},
    {"subject": "BCADS-304P", "slot": "D3-E", "room": "AB11-LAB3", "enrolled": 42, "capacity": 90},
    {"subject": "MCA-104P", "slot": "D3-E", "room": "AB11-LAB2", "enrolled": 60, "capacity": 90},
    {"subject": "MCA-304P", "slot": "D3-E", "room": "AB11-LAB5", "enrolled": 55, "capacity": 80}
  ]'::jsonb,
  now() - interval '1 hour',
  now() - interval '59 minutes',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  quality_score = EXCLUDED.quality_score,
  status = EXCLUDED.status,
  parameters = EXCLUDED.parameters,
  result = EXCLUDED.result,
  published_at = EXCLUDED.published_at;
