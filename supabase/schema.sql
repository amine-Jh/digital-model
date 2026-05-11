-- =============================================================================
-- CogniTest — Supabase schema
-- =============================================================================
-- Versioned migrations (canonical): supabase/migrations/README.md
-- Merged bootstrap (schema + RLS):     supabase/migrations/0001_baseline.sql
--
-- Split apply on Supabase (SQL Editor):
--   1. paste this file, run it
--   2. paste supabase/policies.sql, run it
--   3. (optional) paste supabase/seed.sql, run it
--
-- All identifiers use snake_case. Timestamps use TIMESTAMPTZ.
-- The `auth.users` table is provided by Supabase Auth; we never write to it
-- directly — we extend it via the public.profiles 1-to-1 mapping.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "uuid-ossp";  -- uuid_generate_v4 (legacy)

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'teacher', 'admin', 'super_admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type public.session_status as enum ('in-progress', 'completed', 'abandoned');
  end if;

  if not exists (select 1 from pg_type where typname = 'grade_level') then
    create type public.grade_level as enum (
      '3ème année collège',
      'Tronc commun scientifique',
      '1ère année Baccalauréat – Sciences expérimentales',
      '1ère année Baccalauréat – Sciences mathématiques'
    );
  end if;
end$$;

-- Generic touch-updated_at (used by profiles, schools, …)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- -----------------------------------------------------------------------------
-- schools  (establishments; teachers attach via profiles.school_id)
-- -----------------------------------------------------------------------------
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists schools_active_idx on public.schools (is_active);

drop trigger if exists trg_schools_touch on public.schools;
create trigger trg_schools_touch
  before update on public.schools
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- profiles  (1-to-1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'student',
  school_id   uuid references public.schools(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_school_idx on public.profiles (school_id);

-- Trigger: auto-create a profile row when a new auth.users row appears.
-- Role defaults to 'student' but can be overridden by raw_user_meta_data.role
-- at sign-up time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  safe_role public.user_role;
  meta_school text;
  resolved_school uuid;
begin
  meta_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', '')));
  if meta_role in ('teacher', 'student') then
    safe_role := meta_role::public.user_role;
  else
    safe_role := 'student';
  end if;

  meta_school := trim(coalesce(new.raw_user_meta_data->>'school_id', ''));
  resolved_school := null;
  if meta_school <> '' and meta_school ~* '^[0-9a-f-]{36}$' then
    select s.id into resolved_school
    from public.schools s
    where s.id = meta_school::uuid and s.is_active = true;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role,
    case when safe_role = 'teacher' then resolved_school else null end
  )
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- student_profiles  (student-specific extras + teacher link)
-- -----------------------------------------------------------------------------
create table if not exists public.student_profiles (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  full_name                text,
  age                      int check (age between 5 and 100),
  gender                   text check (gender in ('Male', 'Female', '')),
  teacher_id               uuid references public.profiles(id) on delete set null,
  teacher_name             text,
  school_name              text,
  grade_level              public.grade_level,
  academic_track           text,
  academic_year            text,
  math_average_2024_2025   numeric(4,2) check (math_average_2024_2025 between 0 and 20),
  math_average_2025_2026   numeric(4,2) check (math_average_2025_2026 between 0 and 20),
  updated_at               timestamptz not null default now()
);

create index if not exists student_profiles_teacher_idx on public.student_profiles (teacher_id);

drop trigger if exists trg_student_profiles_touch on public.student_profiles;
create trigger trg_student_profiles_touch
  before update on public.student_profiles
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- students  (legacy compatibility table from existing Supabase exports)
-- -----------------------------------------------------------------------------
create table if not exists public.students (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- tests  (catalogue — referenced by test_sessions.test_id)
-- -----------------------------------------------------------------------------
create table if not exists public.tests (
  id           text primary key,                -- e.g. 'test-symetrie-axiale'
  name         text not null,
  domain       text not null,                   -- 'cognition-geometrie' | 'attentional' | …
  description  text,
  metadata     jsonb not null default '{}'::jsonb,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tests_domain_idx on public.tests (domain) where is_active;

drop trigger if exists trg_tests_touch on public.tests;
create trigger trg_tests_touch
  before update on public.tests
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- questions  (canonical question bank — optional; you may keep questions
-- in code and skip this table for now, but the FK is here for the future).
-- -----------------------------------------------------------------------------
create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  test_id         text not null references public.tests(id) on delete cascade,
  external_id     text not null,                 -- e.g. 'Q19a'
  prompt          text,
  options         jsonb not null default '[]'::jsonb,
  correct_answer  jsonb,                          -- number | number[] | null
  competencies    text[] not null default '{}',   -- {C1, C2}
  position        int,
  metadata        jsonb not null default '{}'::jsonb,
  unique (test_id, external_id)
);

create index if not exists questions_test_idx on public.questions (test_id, position);

-- -----------------------------------------------------------------------------
-- test_sessions  (one row per attempt of a test by a user)
-- -----------------------------------------------------------------------------
create table if not exists public.test_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  test_id           text not null references public.tests(id) on delete restrict,
  status            public.session_status not null default 'in-progress',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  total_ms          int,
  score             numeric(5,2),                -- final % (0–100), supports partial credit
  correct_count     int,
  total_questions   int,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists test_sessions_user_idx     on public.test_sessions (user_id, started_at desc);
create index if not exists test_sessions_test_idx    on public.test_sessions (test_id, completed_at desc);
create index if not exists test_sessions_status_idx  on public.test_sessions (status);

drop trigger if exists trg_test_sessions_touch on public.test_sessions;
create trigger trg_test_sessions_touch
  before update on public.test_sessions
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- trial_results  (per-question response inside a session)
-- -----------------------------------------------------------------------------
create table if not exists public.trial_results (
  id                bigserial primary key,
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  question_index    int not null,
  question_id       text not null,
  selected          jsonb not null default '[]'::jsonb,  -- number[]
  free_text         text,
  correct           boolean not null default false,
  score             numeric(4,3) not null default 0,     -- per-question score in [0, 1]
  reaction_time_ms  int,
  created_at        timestamptz not null default now()
);

create index if not exists trial_results_session_idx on public.trial_results (session_id, question_index);

-- -----------------------------------------------------------------------------
-- geometry_session_part_scores  (normalized geometry analytics by part)
-- -----------------------------------------------------------------------------
create table if not exists public.geometry_session_part_scores (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  part_number       smallint not null check (part_number >= 1 and part_number <= 3),
  part_label        text,
  earned            numeric not null default 0,
  max_points        numeric not null default 0,
  percent           numeric,
  score_out_of_20   numeric,
  correct_count     int not null default 0,
  total_scorable    int not null default 0,
  created_at        timestamptz not null default now(),
  unique (session_id, part_number)
);

create index if not exists geometry_part_session_idx
  on public.geometry_session_part_scores (session_id);

-- -----------------------------------------------------------------------------
-- geometry_session_capacity_scores  (normalized geometry analytics by capacity)
-- -----------------------------------------------------------------------------
create table if not exists public.geometry_session_capacity_scores (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  ck_code           text not null,
  ck_name           text,
  earned            numeric not null default 0,
  max_points        numeric not null default 0,
  percent           numeric,
  score_out_of_20   numeric,
  created_at        timestamptz not null default now(),
  unique (session_id, ck_code)
);

create index if not exists geometry_cap_session_idx
  on public.geometry_session_capacity_scores (session_id);

-- -----------------------------------------------------------------------------
-- metrics  (longitudinal aggregates — refreshed nightly or on insert).
-- One row per (user, test_id, period). Period is a yyyy-mm string.
-- -----------------------------------------------------------------------------
create table if not exists public.metrics (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  test_id        text not null references public.tests(id) on delete cascade,
  period         text not null,                          -- e.g. '2026-05'
  attempts       int not null default 0,
  best_score     numeric(5,2),
  avg_score      numeric(5,2),
  last_attempt   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, test_id, period)
);

create index if not exists metrics_test_period_idx on public.metrics (test_id, period);

-- -----------------------------------------------------------------------------
-- Helper view: my_students  (a teacher's roster derived from student_profiles)
-- -----------------------------------------------------------------------------
create or replace view public.my_students as
  select
    sp.user_id,
    p.full_name,
    p.email,
    sp.grade_level,
    sp.math_average_2024_2025,
    sp.math_average_2025_2026,
    sp.teacher_id
  from public.student_profiles sp
  join public.profiles p on p.id = sp.user_id;
