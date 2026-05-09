-- =============================================================================
-- Migration 0004 — Teacher directory RLS on profiles
-- CogniTest: supabase/migrations/ (run in order; see README.md)
--
-- Allow authenticated users to read rows in public.profiles where role = teacher
-- (student profile setup: pick an existing teacher). Safe to run on existing DBs.

drop policy if exists profiles_teacher_directory on public.profiles;
create policy profiles_teacher_directory on public.profiles
  for select using (role = 'teacher' and auth.uid() is not null);
