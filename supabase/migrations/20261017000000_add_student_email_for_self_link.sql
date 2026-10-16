ALTER TABLE public.student_enrollments
  ADD COLUMN IF NOT EXISTS student_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_enrollments_student_email
  ON public.student_enrollments (lower(btrim(student_email)))
  WHERE student_email IS NOT NULL AND btrim(student_email) <> '';
