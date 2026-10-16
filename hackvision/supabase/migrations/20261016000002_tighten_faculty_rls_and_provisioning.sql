-- ============================================================================
-- ExamOpt Migration: 20261016000002_tighten_faculty_rls_and_provisioning.sql
-- Problem Statement C10: Intelligent Examination Timetable Optimization System
-- Forward-only migration addressing Defect 5 (RLS & Identity Provisioning Safety)
--
-- DO NOT APPLY TO CLOUD PROJECT WITHOUT EXPLICIT USER AUTHORIZATION.
--
-- IMPROVEMENTS:
-- 1. Tightens 'faculty' table RLS: Restricts full record (including private
--    unavailable_slots and max_duties) to the specific faculty member or admin.
-- 2. Prevents privilege escalation during self-registration: Adds a secure
--    trigger on auth.users that safely provisions a user_profile with role 'STUDENT'.
--    Any client-supplied role claim is strictly sanitized.
-- 3. Adds missing foreign key index on published_schedules(run_id).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add Index on published_schedules(run_id) for Fast Verification
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pg_published_schedules_run 
ON published_schedules(run_id);

-- ----------------------------------------------------------------------------
-- STEP 2: Tighten Faculty RLS Policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Faculty view access" ON faculty;

-- Faculty can view only their own record and duties, while admins retain full visibility
CREATE POLICY "Faculty view own record or admin"
ON faculty FOR SELECT
USING (
    faculty_id = public.get_current_faculty_id()
    OR public.is_admin()
);

-- ----------------------------------------------------------------------------
-- STEP 3: Controlled User Provisioning Trigger (Safe Self-Registration)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    assigned_role VARCHAR(50);
    assigned_roll VARCHAR(50);
    assigned_fac VARCHAR(50);
BEGIN
    -- Ordinary public signups are strictly defaulted to 'STUDENT'
    -- Admin role can ONLY be granted by existing administrators or service_role
    assigned_role := 'STUDENT';
    assigned_roll := NEW.raw_user_meta_data->>'student_roll_no';
    assigned_fac := NULL;

    -- Only if created via service_role or admin invitation do we trust explicit role
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
        IF NEW.raw_user_meta_data->>'role' IN ('ADMIN', 'FACULTY', 'STUDENT') THEN
            assigned_role := NEW.raw_user_meta_data->>'role';
            assigned_fac := NEW.raw_user_meta_data->>'faculty_id';
        END IF;
    END IF;

    INSERT INTO public.user_profiles (id, role, student_roll_no, faculty_id)
    VALUES (NEW.id, assigned_role, assigned_roll, assigned_fac)
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Register trigger on auth.users (if permissions allow on managed Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
