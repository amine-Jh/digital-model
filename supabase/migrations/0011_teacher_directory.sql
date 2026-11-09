-- Signed-in users may read the teacher directory (id, name, email, school).
-- Students need this list after they choose a school. No other profile rows are exposed.

drop policy if exists profiles_teacher_directory on public.profiles;
create policy profiles_teacher_directory on public.profiles
  for select to authenticated
  using (role = 'teacher');
