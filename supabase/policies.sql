-- =============================================================================
-- CogniTest — Row Level Security
-- =============================================================================
-- Merged baseline: ../migrations/0001_baseline.sql  |  Guide: ../migrations/README.md
--
-- Run AFTER schema.sql.
--
-- Authorisation model:
--   • student  → can read/write their OWN data
--   • teacher  → can read their students' data (linked via student_profiles.teacher_id)
--                and update student_profiles.teacher_id assignments they own
--   • admin    → full read; full write on tests / questions; otherwise read-only
--
-- We use a security-definer helper `public.role_of(user_id)` to avoid recursive
-- policy lookups (querying public.profiles inside a policy on public.profiles
-- without security definer triggers infinite recursion).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: returns the role of a given auth user (security definer bypasses RLS)
-- -----------------------------------------------------------------------------
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
grant execute on function public.role_of(uuid) to authenticated;

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

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_self_read     on public.profiles;
drop policy if exists profiles_admin_read    on public.profiles;
drop policy if exists profiles_teacher_read  on public.profiles;
drop policy if exists profiles_self_update   on public.profiles;
drop policy if exists profiles_admin_update  on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

-- Any signed-in user may list registered teachers (for student profile "referent teacher" picker).
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

-- -----------------------------------------------------------------------------
-- schools
-- -----------------------------------------------------------------------------
alter table public.schools enable row level security;

drop policy if exists schools_public_read on public.schools;
create policy schools_public_read on public.schools
  for select using (is_active = true);

drop policy if exists schools_super_admin_all on public.schools;
create policy schools_super_admin_all on public.schools
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- student_profiles
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- tests + questions  (catalogue — readable by any authenticated user)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- test_sessions  (a session belongs to one user; teachers see their roster's;
-- admins see everything)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- trial_results  (children of test_sessions — same access rules)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- metrics  (read-only for owner / teacher / admin; writes only via service role)
-- -----------------------------------------------------------------------------
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
