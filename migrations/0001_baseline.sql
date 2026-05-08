create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

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

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- -----------------------------------------------------------------------------
-- schools
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
-- profiles (1-to-1 with auth.users on Supabase)
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
-- student_profiles
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
-- tests
-- -----------------------------------------------------------------------------
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

drop trigger if exists trg_tests_touch on public.tests;
create trigger trg_tests_touch
  before update on public.tests
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- questions
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- test_sessions
-- -----------------------------------------------------------------------------
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

create index if not exists test_sessions_user_idx     on public.test_sessions (user_id, started_at desc);
create index if not exists test_sessions_test_idx    on public.test_sessions (test_id, completed_at desc);
create index if not exists test_sessions_status_idx  on public.test_sessions (status);

drop trigger if exists trg_test_sessions_touch on public.test_sessions;
create trigger trg_test_sessions_touch
  before update on public.test_sessions
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- trial_results
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- metrics
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- View: teacher roster helper
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

-- =============================================================================
-- Row Level Security (run in same transaction / immediately after schema)
-- =============================================================================

create or replace function public.role_of(uid uuid)
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = uid
$$;

revoke all on function public.role_of(uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.role_of(uuid) to authenticated;
  end if;
end
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.role_of(auth.uid()) in ('admin', 'super_admin'), false)
$$;

create or replace function public.is_teacher()
returns boolean language sql stable as $$
  select coalesce(public.role_of(auth.uid()) = 'teacher', false)
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select coalesce(public.role_of(auth.uid()) = 'super_admin', false)
$$;

create or replace function public.is_my_student(student uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.student_profiles
    where user_id = student
      and teacher_id = auth.uid()
  )
$$;

-- profiles
alter table public.profiles enable row level security;

drop policy if exists profiles_self_read     on public.profiles;
drop policy if exists profiles_admin_read    on public.profiles;
drop policy if exists profiles_teacher_read  on public.profiles;
drop policy if exists profiles_self_update   on public.profiles;
drop policy if exists profiles_admin_update  on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_teacher_directory on public.profiles;
create policy profiles_teacher_directory on public.profiles
  for select using (role = 'teacher' and auth.uid() is not null);

create policy profiles_admin_read on public.profiles
  for select using (public.is_admin());

create policy profiles_teacher_read on public.profiles
  for select using (public.is_teacher() and public.is_my_student(id));

create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- schools
alter table public.schools enable row level security;

drop policy if exists schools_public_read on public.schools;
create policy schools_public_read on public.schools
  for select using (is_active = true);

drop policy if exists schools_super_admin_all on public.schools;
create policy schools_super_admin_all on public.schools
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- student_profiles
alter table public.student_profiles enable row level security;

drop policy if exists sp_self_rw         on public.student_profiles;
drop policy if exists sp_teacher_read    on public.student_profiles;
drop policy if exists sp_admin_all       on public.student_profiles;

create policy sp_self_rw on public.student_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sp_teacher_read on public.student_profiles
  for select using (public.is_teacher() and teacher_id = auth.uid());

create policy sp_admin_all on public.student_profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- tests + questions
alter table public.tests enable row level security;

drop policy if exists tests_read_authed   on public.tests;
drop policy if exists tests_admin_write   on public.tests;

create policy tests_read_authed on public.tests
  for select using (auth.role() = 'authenticated');

create policy tests_admin_write on public.tests
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.questions enable row level security;

drop policy if exists questions_read_authed  on public.questions;
drop policy if exists questions_admin_write  on public.questions;

create policy questions_read_authed on public.questions
  for select using (auth.role() = 'authenticated');

create policy questions_admin_write on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- test_sessions
alter table public.test_sessions enable row level security;

drop policy if exists ts_self_select   on public.test_sessions;
drop policy if exists ts_self_insert   on public.test_sessions;
drop policy if exists ts_self_update   on public.test_sessions;
drop policy if exists ts_teacher_read  on public.test_sessions;
drop policy if exists ts_admin_all     on public.test_sessions;

create policy ts_self_select on public.test_sessions
  for select using (auth.uid() = user_id);

create policy ts_self_insert on public.test_sessions
  for insert with check (auth.uid() = user_id);

create policy ts_self_update on public.test_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ts_teacher_read on public.test_sessions
  for select using (public.is_teacher() and public.is_my_student(user_id));

create policy ts_admin_all on public.test_sessions
  for all using (public.is_admin()) with check (public.is_admin());

-- trial_results
alter table public.trial_results enable row level security;

drop policy if exists tr_self_select   on public.trial_results;
drop policy if exists tr_self_insert   on public.trial_results;
drop policy if exists tr_teacher_read  on public.trial_results;
drop policy if exists tr_admin_all     on public.trial_results;

create policy tr_self_select on public.trial_results
  for select using (
    exists (
      select 1 from public.test_sessions s
      where s.id = trial_results.session_id and s.user_id = auth.uid()
    )
  );

create policy tr_self_insert on public.trial_results
  for insert with check (
    exists (
      select 1 from public.test_sessions s
      where s.id = trial_results.session_id and s.user_id = auth.uid()
    )
  );

create policy tr_teacher_read on public.trial_results
  for select using (
    public.is_teacher()
    and exists (
      select 1 from public.test_sessions s
      where s.id = trial_results.session_id and public.is_my_student(s.user_id)
    )
  );

create policy tr_admin_all on public.trial_results
  for all using (public.is_admin()) with check (public.is_admin());

-- metrics
alter table public.metrics enable row level security;

drop policy if exists m_self_read     on public.metrics;
drop policy if exists m_teacher_read  on public.metrics;
drop policy if exists m_admin_all     on public.metrics;

create policy m_self_read on public.metrics
  for select using (auth.uid() = user_id);

create policy m_teacher_read on public.metrics
  for select using (public.is_teacher() and public.is_my_student(user_id));

create policy m_admin_all on public.metrics
  for all using (public.is_admin()) with check (public.is_admin());
