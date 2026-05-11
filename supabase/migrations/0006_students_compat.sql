-- =============================================================================
-- Migration 0006 — Students compatibility table
-- CogniTest: supabase/migrations/ (run in order; see README.md)
--
-- Matches the lightweight public.students table present in existing Supabase
-- schema exports. The app uses public.student_profiles for real student data.

create table if not exists public.students (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now()
);
