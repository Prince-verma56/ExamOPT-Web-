-- =============================================================================
-- Migration: 20261016000001_harden_rls_and_indexes.sql
-- Project: ExamOpt Studio (GLA HackVision 2.0 - Problem Statement C10)
-- Target: Supabase / PostgreSQL (Project: tvyiqyngqehrxrcxqwei)
-- =============================================================================

-- 1. Ensure Domain Tables Exist
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.exam_rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  building TEXT,
  capacity INTEGER NOT NULL,
  room_type TEXT DEFAULT 'standard',
  facilities JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_slots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  session TEXT DEFAULT 'morning',
  label TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_time_slots_date_start_session UNIQUE(date, start_time, session)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  program TEXT NOT NULL,
  semester INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 180,
  exam_type TEXT DEFAULT 'theory',
  requires_lab BOOLEAN DEFAULT false,
  fixed_slot_id TEXT REFERENCES public.time_slots(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  program TEXT NOT NULL,
  semester INTEGER NOT NULL,
  strength INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  roll_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  group_id TEXT REFERENCES public.student_groups(id) ON DELETE SET NULL,
  program TEXT NOT NULL,
  semester INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_backlog BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_enrollments_student_subject UNIQUE(student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.room_unavailabilities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT NOT NULL REFERENCES public.exam_rooms(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_room_unavailabilities_room_slot UNIQUE(room_id, slot_id)
);

CREATE TABLE IF NOT EXISTS public.subject_unavailabilities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_subject_unavailabilities_subject_slot UNIQUE(subject_id, slot_id)
);

CREATE TABLE IF NOT EXISTS public.subject_constraints (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL,
  room_id TEXT REFERENCES public.exam_rooms(id) ON DELETE SET NULL,
  required_room_type TEXT,
  min_capacity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schedule_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  algorithm_name TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'draft',
  dataset_version TEXT,
  parameters JSONB,
  result JSONB,
  error_message TEXT,
  quality_score FLOAT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Performance Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_exam_rooms_room_type ON public.exam_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_is_active ON public.exam_rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_time_slots_date_session ON public.time_slots(date, session);
CREATE INDEX IF NOT EXISTS idx_time_slots_is_available ON public.time_slots(is_available);

CREATE INDEX IF NOT EXISTS idx_subjects_program_semester ON public.subjects(program, semester);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_type ON public.subjects(exam_type);
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);

CREATE INDEX IF NOT EXISTS idx_student_groups_program_semester ON public.student_groups(program, semester);

CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_group_id ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_program_semester ON public.students(program, semester);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id ON public.enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_is_backlog ON public.enrollments(is_backlog);

CREATE INDEX IF NOT EXISTS idx_schedule_runs_status ON public.schedule_runs(status);
CREATE INDEX IF NOT EXISTS idx_schedule_runs_created_at ON public.schedule_runs(created_at);

-- 3. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_unavailabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_unavailabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_runs ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies
-- -----------------------------------------------------------------------------

-- Drop existing policies if reapplying
DROP POLICY IF EXISTS "Allow public read access on exam_rooms" ON public.exam_rooms;
DROP POLICY IF EXISTS "Allow service role full access on exam_rooms" ON public.exam_rooms;

DROP POLICY IF EXISTS "Allow public read access on time_slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow service role full access on time_slots" ON public.time_slots;

DROP POLICY IF EXISTS "Allow public read access on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow service role full access on subjects" ON public.subjects;

DROP POLICY IF EXISTS "Allow public read access on student_groups" ON public.student_groups;
DROP POLICY IF EXISTS "Allow service role full access on student_groups" ON public.student_groups;

DROP POLICY IF EXISTS "Allow public read access on students" ON public.students;
DROP POLICY IF EXISTS "Allow service role full access on students" ON public.students;

DROP POLICY IF EXISTS "Allow public read access on enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Allow service role full access on enrollments" ON public.enrollments;

DROP POLICY IF EXISTS "Allow public read access on schedule_runs" ON public.schedule_runs;
DROP POLICY IF EXISTS "Allow service role full access on schedule_runs" ON public.schedule_runs;

-- Public read policies (facilitates student lookup and timetable viewing)
CREATE POLICY "Allow public read access on exam_rooms"
  ON public.exam_rooms FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on time_slots"
  ON public.time_slots FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on subjects"
  ON public.subjects FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on student_groups"
  ON public.student_groups FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on students"
  ON public.students FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on enrollments"
  ON public.enrollments FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on schedule_runs"
  ON public.schedule_runs FOR SELECT
  USING (status = 'published' OR auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Service role full control policies (for backend API and admin mutations)
CREATE POLICY "Allow service role full access on exam_rooms"
  ON public.exam_rooms FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on time_slots"
  ON public.time_slots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on subjects"
  ON public.subjects FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on student_groups"
  ON public.student_groups FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on students"
  ON public.students FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on enrollments"
  ON public.enrollments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on schedule_runs"
  ON public.schedule_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
