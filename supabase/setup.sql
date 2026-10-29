-- =============================================================================
-- CogniTest — complete database setup for a NEW Supabase project
-- =============================================================================
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent: re-running is safe (no data is dropped).
--
-- Sections
--   1. Enums
--   2. Tables
--   3. Role helper functions
--   4. Triggers (signup → profile, privilege guards, updated_at)
--   5. View (teacher roster)
--   6. Row Level Security policies
--   7. Grants (least privilege for anon / authenticated)
--   8. Test catalogue seed
--
-- Roles: student | teacher | admin | super_admin
--   • Signup can only create `student` or `teacher` (never admin).
--   • Only a super_admin (or SQL / secret key) can change a role.
--   • The first super_admin is promoted manually — see docs/SUPABASE-SETUP.md.
-- =============================================================================


-- =============================================================================
-- 1. Enums
-- =============================================================================
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


-- =============================================================================
-- 2. Tables
-- =============================================================================

-- schools (établissements) ----------------------------------------------------
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists schools_active_idx on public.schools (is_active);

-- profiles (1-to-1 with auth.users) -------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'student',
  school_id   uuid references public.schools(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_school_idx on public.profiles (school_id);

-- student_profiles (academic info + assigned teacher) -------------------------
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

-- tests (catalogue; FK target for sessions) -----------------------------------
create table if not exists public.tests (
  id           text primary key,
  name         text not null,
  domain       text not null,
  description  text,
  metadata     jsonb not null default '{}'::jsonb,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tests_domain_idx on public.tests (domain) where is_active;

-- questions (reserved for a DB question bank; answer key hidden from users) ---
create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  test_id         text not null references public.tests(id) on delete cascade,
  external_id     text not null,
  prompt          text,
  options         jsonb not null default '[]'::jsonb,
  correct_answer  jsonb,
  competencies    text[] not null default '{}',
  position        int,
  metadata        jsonb not null default '{}'::jsonb,
  unique (test_id, external_id)
);
create index if not exists questions_test_idx on public.questions (test_id, position);

-- test_sessions (one attempt) -------------------------------------------------
create table if not exists public.test_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  test_id           text not null references public.tests(id) on delete restrict,
  status            public.session_status not null default 'in-progress',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  total_ms          int,
  score             numeric(5,2),
  correct_count     int,
  total_questions   int,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists test_sessions_user_idx   on public.test_sessions (user_id, started_at desc);
create index if not exists test_sessions_test_idx   on public.test_sessions (test_id, completed_at desc);
create index if not exists test_sessions_status_idx on public.test_sessions (status);

-- trial_results (one answer within a session) ---------------------------------
create table if not exists public.trial_results (
  id                bigserial primary key,
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  question_index    int not null,
  question_id       text not null,
  selected          jsonb not null default '[]'::jsonb,
  free_text         text,
  correct           boolean not null default false,
  score             numeric(4,3) not null default 0,
  reaction_time_ms  int,
  created_at        timestamptz not null default now()
);
create index if not exists trial_results_session_idx on public.trial_results (session_id, question_index);

-- metrics (reserved for aggregates) -------------------------------------------
create table if not exists public.metrics (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  test_id        text not null references public.tests(id) on delete cascade,
  period         text not null,
  attempts       int not null default 0,
  best_score     numeric(5,2),
  avg_score      numeric(5,2),
  last_attempt   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, test_id, period)
);
create index if not exists metrics_test_period_idx on public.metrics (test_id, period);

-- geometry analytics (normalized mirror of test_sessions.metadata) -------------
create table if not exists public.geometry_session_part_scores (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.test_sessions(id) on delete cascade,
  part_number       smallint not null check (part_number between 1 and 3),
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
create index if not exists geometry_part_session_idx on public.geometry_session_part_scores (session_id);

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
create index if not exists geometry_cap_session_idx on public.geometry_session_capacity_scores (session_id);


-- =============================================================================
-- 3. Role helper functions (used by RLS policies)
-- =============================================================================
create or replace function public.role_of(uid uuid)
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = uid
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.role_of(auth.uid()) in ('admin', 'super_admin'), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.role_of(auth.uid()) = 'super_admin', false)
$$;

create or replace function public.is_teacher()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.role_of(auth.uid()) = 'teacher', false)
$$;

create or replace function public.is_my_student(student uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_profiles
    where user_id = student and teacher_id = auth.uid()
  )
$$;


-- =============================================================================
-- 4. Triggers
-- =============================================================================

-- updated_at ------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_schools_touch on public.schools;
create trigger trg_schools_touch before update on public.schools
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_student_profiles_touch on public.student_profiles;
create trigger trg_student_profiles_touch before update on public.student_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tests_touch on public.tests;
create trigger trg_tests_touch before update on public.tests
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_test_sessions_touch on public.test_sessions;
create trigger trg_test_sessions_touch before update on public.test_sessions
  for each row execute function public.touch_updated_at();

-- Signup → profiles row. Only `student` / `teacher` may come from signup
-- metadata; anything else becomes `student`. Teachers may attach to an
-- active school via metadata.school_id.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  meta_role       text;
  safe_role       public.user_role;
  meta_school     text;
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
  if meta_school ~* '^[0-9a-f-]{36}$' then
    select s.id into resolved_school
    from public.schools s
    where s.id = meta_school::uuid and s.is_active;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
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

-- Keep profiles.email in sync when a user changes e-mail in Supabase Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Privileged profile columns: only trusted paths may change them.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- No end-user JWT: SQL editor, Auth triggers, or the secret key.
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profiles.id cannot be changed' using errcode = '42501';
  end if;
  if new.email is distinct from old.email then
    raise exception 'profiles.email is managed by Supabase Auth' using errcode = '42501';
  end if;
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;
  if new.school_id is distinct from old.school_id and not public.is_admin() then
    raise exception 'Only an admin can change school affiliation' using errcode = '42501';
  end if;
  return new;
end$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- student_profiles.teacher_id must reference a real teacher.
create or replace function public.check_student_profile_teacher()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.teacher_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.teacher_id is not distinct from old.teacher_id then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = new.teacher_id and p.role = 'teacher'
  ) then
    raise exception 'teacher_id must reference a teacher profile' using errcode = '23514';
  end if;
  return new;
end$$;

drop trigger if exists trg_student_profiles_teacher_check on public.student_profiles;
create trigger trg_student_profiles_teacher_check
  before insert or update on public.student_profiles
  for each row execute function public.check_student_profile_teacher();


-- =============================================================================
-- 5. View — teacher roster (evaluated with the CALLER's RLS)
-- =============================================================================
create or replace view public.my_students
with (security_invoker = true) as
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


-- =============================================================================
-- 6. Row Level Security
-- =============================================================================
alter table public.schools                          enable row level security;
alter table public.profiles                         enable row level security;
alter table public.student_profiles                 enable row level security;
alter table public.tests                            enable row level security;
alter table public.questions                        enable row level security;
alter table public.test_sessions                    enable row level security;
alter table public.trial_results                    enable row level security;
alter table public.metrics                          enable row level security;
alter table public.geometry_session_part_scores     enable row level security;
alter table public.geometry_session_capacity_scores enable row level security;

-- schools ---------------------------------------------------------------------
drop policy if exists schools_read_active       on public.schools;
drop policy if exists schools_super_admin_all   on public.schools;
create policy schools_read_active on public.schools
  for select to authenticated using (is_active or public.is_admin());
create policy schools_super_admin_all on public.schools
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- profiles --------------------------------------------------------------------
drop policy if exists profiles_self_read     on public.profiles;
drop policy if exists profiles_teacher_read  on public.profiles;
drop policy if exists profiles_admin_read    on public.profiles;
drop policy if exists profiles_self_update   on public.profiles;
drop policy if exists profiles_admin_update  on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_teacher_read on public.profiles
  for select to authenticated using (public.is_teacher() and public.is_my_student(id));
create policy profiles_admin_read on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- No INSERT/DELETE policies: rows are created by the signup trigger and
-- removed by the auth.users cascade.

-- student_profiles ------------------------------------------------------------
drop policy if exists sp_self_rw       on public.student_profiles;
drop policy if exists sp_teacher_read  on public.student_profiles;
drop policy if exists sp_admin_all     on public.student_profiles;
create policy sp_self_rw on public.student_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sp_teacher_read on public.student_profiles
  for select to authenticated using (public.is_teacher() and teacher_id = auth.uid());
create policy sp_admin_all on public.student_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tests -----------------------------------------------------------------------
drop policy if exists tests_read_authed  on public.tests;
drop policy if exists tests_admin_write  on public.tests;
create policy tests_read_authed on public.tests
  for select to authenticated using (true);
create policy tests_admin_write on public.tests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- questions -------------------------------------------------------------------
drop policy if exists questions_read_authed  on public.questions;
drop policy if exists questions_admin_write  on public.questions;
create policy questions_read_authed on public.questions
  for select to authenticated using (true);
create policy questions_admin_write on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- test_sessions ---------------------------------------------------------------
drop policy if exists ts_self_select   on public.test_sessions;
drop policy if exists ts_self_insert   on public.test_sessions;
drop policy if exists ts_self_update   on public.test_sessions;
drop policy if exists ts_teacher_read  on public.test_sessions;
drop policy if exists ts_admin_all     on public.test_sessions;
create policy ts_self_select on public.test_sessions
  for select to authenticated using (user_id = auth.uid());
create policy ts_self_insert on public.test_sessions
  for insert to authenticated with check (user_id = auth.uid());
-- Owners can only finish sessions that are still running (no rewriting scores).
create policy ts_self_update on public.test_sessions
  for update to authenticated
  using (user_id = auth.uid() and status = 'in-progress')
  with check (user_id = auth.uid());
create policy ts_teacher_read on public.test_sessions
  for select to authenticated using (public.is_teacher() and public.is_my_student(user_id));
create policy ts_admin_all on public.test_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- trial_results ---------------------------------------------------------------
drop policy if exists tr_self_select   on public.trial_results;
drop policy if exists tr_self_insert   on public.trial_results;
drop policy if exists tr_teacher_read  on public.trial_results;
drop policy if exists tr_admin_all     on public.trial_results;
create policy tr_self_select on public.trial_results
  for select to authenticated using (
    exists (select 1 from public.test_sessions s
            where s.id = trial_results.session_id and s.user_id = auth.uid()));
create policy tr_self_insert on public.trial_results
  for insert to authenticated with check (
    exists (select 1 from public.test_sessions s
            where s.id = trial_results.session_id and s.user_id = auth.uid()));
create policy tr_teacher_read on public.trial_results
  for select to authenticated using (
    public.is_teacher() and exists (
      select 1 from public.test_sessions s
      where s.id = trial_results.session_id and public.is_my_student(s.user_id)));
create policy tr_admin_all on public.trial_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- metrics ---------------------------------------------------------------------
drop policy if exists m_self_read     on public.metrics;
drop policy if exists m_teacher_read  on public.metrics;
drop policy if exists m_admin_all     on public.metrics;
create policy m_self_read on public.metrics
  for select to authenticated using (user_id = auth.uid());
create policy m_teacher_read on public.metrics
  for select to authenticated using (public.is_teacher() and public.is_my_student(user_id));
create policy m_admin_all on public.metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- geometry analytics (same pattern as trial_results) --------------------------
drop policy if exists gpart_self_select   on public.geometry_session_part_scores;
drop policy if exists gpart_self_insert   on public.geometry_session_part_scores;
drop policy if exists gpart_teacher_read  on public.geometry_session_part_scores;
drop policy if exists gpart_admin_all     on public.geometry_session_part_scores;
create policy gpart_self_select on public.geometry_session_part_scores
  for select to authenticated using (
    exists (select 1 from public.test_sessions s
            where s.id = geometry_session_part_scores.session_id and s.user_id = auth.uid()));
create policy gpart_self_insert on public.geometry_session_part_scores
  for insert to authenticated with check (
    exists (select 1 from public.test_sessions s
            where s.id = geometry_session_part_scores.session_id and s.user_id = auth.uid()));
create policy gpart_teacher_read on public.geometry_session_part_scores
  for select to authenticated using (
    public.is_teacher() and exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_part_scores.session_id and public.is_my_student(s.user_id)));
create policy gpart_admin_all on public.geometry_session_part_scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists gcap_self_select   on public.geometry_session_capacity_scores;
drop policy if exists gcap_self_insert   on public.geometry_session_capacity_scores;
drop policy if exists gcap_teacher_read  on public.geometry_session_capacity_scores;
drop policy if exists gcap_admin_all     on public.geometry_session_capacity_scores;
create policy gcap_self_select on public.geometry_session_capacity_scores
  for select to authenticated using (
    exists (select 1 from public.test_sessions s
            where s.id = geometry_session_capacity_scores.session_id and s.user_id = auth.uid()));
create policy gcap_self_insert on public.geometry_session_capacity_scores
  for insert to authenticated with check (
    exists (select 1 from public.test_sessions s
            where s.id = geometry_session_capacity_scores.session_id and s.user_id = auth.uid()));
create policy gcap_teacher_read on public.geometry_session_capacity_scores
  for select to authenticated using (
    public.is_teacher() and exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_capacity_scores.session_id and public.is_my_student(s.user_id)));
create policy gcap_admin_all on public.geometry_session_capacity_scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- =============================================================================
-- 7. Grants — anon gets nothing; authenticated is filtered by RLS above;
--    service_role (secret key) bypasses RLS.
-- =============================================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Roster view is read-only.
revoke insert, update, delete on public.my_students from authenticated;

-- Answer key is never readable by end users.
revoke select on public.questions from authenticated;
grant select (id, test_id, external_id, prompt, options, competencies, position, metadata)
  on public.questions to authenticated;

-- Helper functions: callable by signed-in users (needed by RLS), not by anon.
revoke execute on function public.role_of(uuid)        from public, anon;
revoke execute on function public.is_my_student(uuid)  from public, anon;
revoke execute on function public.is_admin()           from public, anon;
revoke execute on function public.is_super_admin()     from public, anon;
revoke execute on function public.is_teacher()         from public, anon;
grant  execute on function public.role_of(uuid)        to authenticated, service_role;
grant  execute on function public.is_my_student(uuid)  to authenticated, service_role;
grant  execute on function public.is_admin()           to authenticated, service_role;
grant  execute on function public.is_super_admin()     to authenticated, service_role;
grant  execute on function public.is_teacher()         to authenticated, service_role;

-- Trigger functions are never called directly through the API.
revoke execute on function public.handle_new_user()                   from public, anon, authenticated;
revoke execute on function public.handle_user_email_change()          from public, anon, authenticated;
revoke execute on function public.guard_profile_privileged_columns()  from public, anon, authenticated;
revoke execute on function public.check_student_profile_teacher()     from public, anon, authenticated;


-- =============================================================================
-- 8. Test catalogue — every test_id the app can save must exist here (FK).
-- =============================================================================
insert into public.tests (id, name, domain, description, is_active) values
  -- Cognitive capacities
  ('test-deductive-reasoning',     'Deductive Reasoning',                'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-inductive-reasoning',     'Inductive Reasoning',                'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-visuo-motor',             'Visuo-Motor Capacity',               'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-visuo-constructive',      'Visuo-Constructive Capacity',        'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-visuo-perceptive',        'Visuo-Perceptive Capacity (hub)',    'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-discrimination',       'VP · Discrimination visuelle',       'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-memoire-sequentielle', 'VP · Mémoire séquentielle',          'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-memoire-perceptive',   'VP · Mémoire perceptive',            'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-cloture',              'VP · Clôture / Relations spatiales', 'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-constance-forme',      'VP · Constance de la forme',         'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-figure-fond',          'VP · Figure-fond',                   'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-intrus',               'VP · Intrus',                        'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-vp-fond-cache',           'VP · Fond caché',                    'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-mental-rotation',         'Mental Rotation 3D',                 'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-mental-rotation-2d',      'Mental Rotation 2D',                 'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-spatial-orientation',     'Spatial Orientation',                'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-spatial-transformation',  'Spatial Transformation',             'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-working-memory',          'Working Memory',                     'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-long-term-memory',        'Long-Term Memory',                   'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-visuo-spatial-memory',    'Visuo-Spatial Memory',               'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-sustained-attention',     'Sustained Attention',                'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-divided-attention',       'Divided Attention',                  'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-selective-attention',     'Selective Attention',                'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-visuo-spatial-attention', 'Visuo-Spatial Attention',            'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-inhibition',              'Inhibition',                         'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-cognitive-flexibility',   'Cognitive Flexibility',              'cognitive-capacity',  'CogniTest catalogue', true),
  ('test-processing-speed',        'Processing Speed',                   'cognitive-capacity',  'CogniTest catalogue', true),
  -- Geometry
  ('test-geo-central-sym',         'Symétrie centrale',                  'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-symetrie-axiale',     'Symétrie axiale',                    'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-line-plane',          'Droite dans le plan',                'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-vectors-complete',    'Vecteurs et translation',            'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-trig-circle',         'Cercle trigonométrique interactif',  'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-space',               'Géométrie dans l''espace',           'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-produit-scalaire',    'Produit scalaire',                   'cognition-geometrie', 'CogniTest catalogue', true),
  ('test-geo-space-volumes',       'Géométrie dans l''espace : volumes', 'cognition-geometrie', 'CogniTest catalogue', true),
  -- Legacy ids still referenced by older navigation / scoring code (hidden from the catalogue)
  ('test-symetrie-axiale',         'Symétrie axiale (legacy)',           'cognition-geometrie', 'Legacy id', false),
  ('test-symetrie-centrale',       'Symétrie centrale (legacy)',         'cognition-geometrie', 'Legacy id', false),
  ('test-droite-plan',             'Droite dans le plan (legacy)',       'cognition-geometrie', 'Legacy id', false),
  ('test-trig-unit-circle',        'Cercle trigonométrique (legacy)',    'cognition-geometrie', 'Legacy id', false),
  ('test-syllogism',               'Syllogismes logiques (legacy)',      'reasoning',           'Legacy id', false),
  ('test-vectors',                 'Vectors (legacy)',                   'cognition-geometrie', 'Legacy id', false),
  ('test-dot-product',             'Dot Product (legacy)',               'cognition-geometrie', 'Legacy id', false),
  ('test-dot-product-space',       'Dot Product in Space (legacy)',      'cognition-geometrie', 'Legacy id', false),
  ('test-transformations-plane',   'Transformations in the Plane (legacy)', 'cognition-geometrie', 'Legacy id', false),
  ('test-trigonometry',            'Trigonometry (legacy)',              'cognition-geometrie', 'Legacy id', false),
  ('test-line-plane',              'Line in the Plane (legacy)',         'cognition-geometrie', 'Legacy id', false)
on conflict (id) do update
  set name        = excluded.name,
      domain      = excluded.domain,
      description = excluded.description,
      is_active   = excluded.is_active;
