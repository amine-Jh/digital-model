-- =============================================================================
-- Migration 0002 — Super admin + locked admin self-registration
-- CogniTest: supabase/migrations/ (run in order; see README.md)
--
-- Run after 0001_baseline.sql (or legacy schema.sql + policies.sql).
-- If you use établissements (`schools`) and `profiles.school_id`, also run
-- 0003_schools_teacher_affiliation.sql so `handle_new_user` stores teacher school metadata.
--
-- 1) Adds enum value `super_admin`.
-- 2) `is_admin()` treats both `admin` and `super_admin` as platform admins (RLS).
-- 3) `handle_new_user` only allows `student` or `teacher` from signup metadata;
--    `admin` / `super_admin` must be assigned via SQL or the super-admin API.
--
-- First super-admin (manual, one-time):
--   • Create user in Dashboard → Authentication (or invite).
--   • Then run (replace email):
--       update public.profiles
--       set role = 'super_admin'::public.user_role
--       where email = 'you@institution.edu';
-- =============================================================================

-- Enum: super_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'super_admin';
  END IF;
END$$;

-- RLS helper: admin area = admin OR super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(public.role_of(auth.uid()) IN ('admin', 'super_admin'), false)
$$;

-- New signups cannot self-assign admin or super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text;
  safe_role public.user_role;
BEGIN
  meta_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', '')));
  IF meta_role IN ('teacher', 'student') THEN
    safe_role := meta_role::public.user_role;
  ELSE
    safe_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
