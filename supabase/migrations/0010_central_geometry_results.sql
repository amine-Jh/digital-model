-- Additive only. Existing sessions, trials and profiles are left in place.
-- Run in the Supabase SQL editor after setup.sql.

alter table public.student_profiles
  add column if not exists class_name text,
  add column if not exists account_status text not null default 'active',
  add column if not exists supervised_test_score numeric(5,2),
  add column if not exists supervised_test_max numeric(5,2),
  add column if not exists supervised_test_on date,
  add column if not exists previous_semester_average numeric(4,2),
  add column if not exists previous_semester_year text;

alter table public.tests
  add column if not exists administration_mode text not null default 'internal'
    check (administration_mode in ('internal', 'external'));

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  imported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  row_count int not null default 0,
  status text not null default 'validated'
);

create table if not exists public.external_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  test_id text not null,
  domain text not null,
  capacity text not null,
  raw_score numeric,
  max_score numeric,
  normalized_score numeric,
  assessed_on date,
  duration_ms int,
  platform text,
  attempt_id text not null default '',
  source text not null default 'external',
  validation_status text not null default 'validated'
    check (validation_status in ('imported', 'validated', 'error')),
  batch_id uuid references public.import_batches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, test_id, capacity, attempt_id)
);

alter table public.import_batches enable row level security;
alter table public.external_results enable row level security;

drop policy if exists import_batches_admin on public.import_batches;
create policy import_batches_admin on public.import_batches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists external_results_admin on public.external_results;
create policy external_results_admin on public.external_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
