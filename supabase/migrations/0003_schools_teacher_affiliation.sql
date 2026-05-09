-- =============================================================================
-- Migration 0003 — Schools + teacher affiliation
-- CogniTest: supabase/migrations/ (run in order; see README.md)
--
-- Run after 0001_baseline.sql and 0002_super_admin.sql (or equivalent).
-- Idempotent: safe on DBs that already have schools from 0001.

-- 1) Table schools
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

-- 2) profiles.school_id
alter table public.profiles
  add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists profiles_school_idx on public.profiles (school_id);

-- 3) Signup: attach teacher to school from metadata.school_id when valid
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
end;
$$;

-- 4) RLS helpers + schools policies (idempotent)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.role_of(auth.uid()) = 'super_admin', false)
$$;

alter table public.schools enable row level security;

drop policy if exists schools_public_read on public.schools;
create policy schools_public_read on public.schools
  for select using (is_active = true);

drop policy if exists schools_super_admin_all on public.schools;
create policy schools_super_admin_all on public.schools
  for all using (public.is_super_admin()) with check (public.is_super_admin());
