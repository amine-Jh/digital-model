-- =============================================================================
-- Migration 0005 — Geometry session part & capacity score tables
-- CogniTest: supabase/migrations/ (run in order; see README.md)
--
-- Normalized mirror of test_sessions.metadata.geometryAnalytics.
-- Requires public.test_sessions (0001 or schema.sql + policies.sql).

-- -----------------------------------------------------------------------------
-- geometry_session_part_scores
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
-- geometry_session_capacity_scores
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
-- RLS (same pattern as trial_results — child of test_sessions)
-- -----------------------------------------------------------------------------
alter table public.geometry_session_part_scores enable row level security;
alter table public.geometry_session_capacity_scores enable row level security;

drop policy if exists gpart_self_select   on public.geometry_session_part_scores;
drop policy if exists gpart_self_insert  on public.geometry_session_part_scores;
drop policy if exists gpart_teacher_read on public.geometry_session_part_scores;
drop policy if exists gpart_admin_all    on public.geometry_session_part_scores;

create policy gpart_self_select on public.geometry_session_part_scores
  for select using (
    exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_part_scores.session_id and s.user_id = auth.uid()
    )
  );

create policy gpart_self_insert on public.geometry_session_part_scores
  for insert with check (
    exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_part_scores.session_id and s.user_id = auth.uid()
    )
  );

create policy gpart_teacher_read on public.geometry_session_part_scores
  for select using (
    public.is_teacher()
    and exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_part_scores.session_id and public.is_my_student(s.user_id)
    )
  );

create policy gpart_admin_all on public.geometry_session_part_scores
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists gcap_self_select   on public.geometry_session_capacity_scores;
drop policy if exists gcap_self_insert  on public.geometry_session_capacity_scores;
drop policy if exists gcap_teacher_read on public.geometry_session_capacity_scores;
drop policy if exists gcap_admin_all    on public.geometry_session_capacity_scores;

create policy gcap_self_select on public.geometry_session_capacity_scores
  for select using (
    exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_capacity_scores.session_id and s.user_id = auth.uid()
    )
  );

create policy gcap_self_insert on public.geometry_session_capacity_scores
  for insert with check (
    exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_capacity_scores.session_id and s.user_id = auth.uid()
    )
  );

create policy gcap_teacher_read on public.geometry_session_capacity_scores
  for select using (
    public.is_teacher()
    and exists (
      select 1 from public.test_sessions s
      where s.id = geometry_session_capacity_scores.session_id and public.is_my_student(s.user_id)
    )
  );

create policy gcap_admin_all on public.geometry_session_capacity_scores
  for all using (public.is_admin()) with check (public.is_admin());
