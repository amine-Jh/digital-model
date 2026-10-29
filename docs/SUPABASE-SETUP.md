# CogniTest — set up a new Supabase project from scratch

This guide takes you from an empty Supabase account to a working app, locally and on Netlify. Follow the steps in order; each one takes a few minutes.

Everything the database needs (tables, security rules, roles, test catalogue) is in **one file:** `[supabase/setup.sql](../supabase/setup.sql)`. It is safe to run more than once.

---

## Step 1 — Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Choose a name (e.g. `cognitest`), a strong **database password** (store it in a password manager), and a region close to your users (e.g. *West EU (Paris)*).
3. If the creation form shows **Security options**, keep **Enable Data API** checked.
4. Wait until the project status is **Healthy**.

---



## Step 2 — Create the database (one script)

1. Dashboard → **SQL Editor** → **New query**.
2. Open `supabase/setup.sql` from this repo, copy **all** of it, paste it, click **Run**.
3. You should see `Success. No rows returned`.

Check it worked (same SQL editor):

```sql
select count(*) as active_tests from public.tests where is_active;   -- expect 35
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;  -- all true
```

What the script creates:


| Object                                                             | Purpose                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `profiles`                                                         | One row per user (email, name, **role**, school). Created automatically on signup. |
| `schools`                                                          | Établissements. Teachers belong to one; students pick one.                         |
| `student_profiles`                                                 | Student academic data + the teacher they chose.                                    |
| `tests`                                                            | Test catalogue (35 active tests + 11 hidden legacy ids).                           |
| `test_sessions`, `trial_results`                                   | Every attempt and every answer.                                                    |
| `geometry_session_part_scores`, `geometry_session_capacity_scores` | Geometry analytics.                                                                |
| `questions`, `metrics`                                             | Reserved for later (question bank, aggregates).                                    |
| `my_students` (view)                                               | Teacher roster — respects the caller's permissions.                                |


Security rules built in:

- Anonymous visitors cannot read any table.
- Students see only their own data. Teachers see only students who chose them. Admins see everything.
- Signup can only create a **student** or a **teacher**. Nobody can give themselves a role. Only a **super admin** can change roles.
- Students cannot change a score after a test is finished.

---



## Step 3 — Configure Authentication

Dashboard → **Authentication**:

1. **Sign In / Providers → Email**
  - **Enable Email provider**: on.
  - **Confirm email**: **on** for production (users must click the link before signing in). You can turn it off during local testing.
  - **Minimum password length**: `8`.
2. **URL Configuration**
  - **Site URL**: your production URL, e.g. `https://your-site.netlify.app` (use `http://localhost:3000` until you deploy).
  - **Redirect URLs**: add both
    - `http://localhost:3000/**`
    - `https://your-site.netlify.app/**`
3. **Emails → SMTP Settings** (production): connect a real SMTP provider (Resend, Brevo, SendGrid…). The built-in mailer only sends a few emails per hour and is meant for testing.

After a user clicks the confirmation link, they come back to the site and **sign in on the landing page** with their email and password.

---



## Step 4 — Get the API keys

Dashboard → **Project Settings → API Keys**:


| Value                              | Where to find it                                     | Env variable                           |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Project URL                        | Project Settings → Data API (or the top of API Keys) | `NEXT_PUBLIC_SUPABASE_URL`             |
| Publishable key `sb_publishable_…` | API Keys → Publishable key                           | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key `sb_secret_…`           | API Keys → Secret keys → **Create/Reveal**           | `SUPABASE_SECRET_KEY`                  |


- The **publishable** key is public: it is shipped to the browser, and the security rules from Step 2 protect the data.
- The **secret** key bypasses all security rules. Keep it **server-side only**: never put it in a `NEXT_PUBLIC_` variable, never commit it, never paste it in chat. If it leaks, create a new one and delete the old one.
- You do **not** need the JWKS URL or the legacy `anon` / `service_role` keys. The app finds the JWKS endpoint automatically.

*(Optional)* **Project Settings → JWT Keys**: if offered, migrate to **asymmetric signing keys**. The app then verifies sessions locally (faster middleware) without any code change.

---



## Step 5 — Run the app locally

1. Create `.env.local` in the repo root (it is gitignored):
  ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
   If an old `.env` exists, update or delete it so it doesn't point to the old project (`.env.local` wins over `.env` for keys defined in both).
2. Install and start:
  ```bash
   npm install
   npm run dev
  ```
3. Open [http://localhost:3000](http://localhost:3000).

---



## Step 6 — Create the users (in this order)



### 6.1 First super admin (one time, manual)

1. Dashboard → **Authentication → Users → Add user → Create new user**.
2. Enter email + password, check **Auto Confirm User**, click **Create user**.
3. SQL Editor → run (replace the email):
  ```sql
   update public.profiles
   set role = 'super_admin', full_name = 'Platform Owner'
   where email = 'you@your-school.ma';

   select email, role from public.profiles where role = 'super_admin';  -- check
  ```
4. Sign in on the app → you land on **/admin**.



### 6.2 Schools — before any teacher

In the app as super admin: **/admin/schools → add each établissement**.

Or with SQL:

```sql
insert into public.schools (name, city) values
  ('Lycée Imam Elchatibi', 'Casablanca'),
  ('Lycée Moulay Idriss', 'Fès');
```

Teachers can only register once at least one active school exists.

### 6.3 Admins (optional)

Super admin → **/admin/admins** → create admin accounts. Admins can see all results and use the research dashboards, but cannot manage schools, teachers or roles.

### 6.4 Teachers

Pick one of these:

- **Super admin creates them**: **/admin/teachers** → email, password, school. *(Recommended: you control who is a teacher.)*
- **Self-registration**: the teacher opens **/register**, chooses **Teacher** and their school.



### 6.5 Students

1. The student opens **/register**, chooses **Student**, and confirms their email if confirmation is on.
2. They complete **/profile-setup** and choose their **school** and **teacher**. With email confirmation **off**, the app opens this page right after registering. With confirmation **on**, nothing redirects them there yet, so tell students to open `/profile-setup` after their first sign-in.
3. From then on, that teacher sees the student in **/teacher/dashboard**.



### Role summary


| Role          | How it's created                 | Can access                                                                 |
| ------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `student`     | `/register`                      | `/dashboard`, `/domains`, `/tests`, `/results`, `/profile` — own data only |
| `teacher`     | `/admin/teachers` or `/register` | `/teacher/*`, `/analytics`, `/reports` — only their own students           |
| `admin`       | `/admin/admins` (super admin)    | `/admin/*` (except the 3 pages below), all results                         |
| `super_admin` | SQL, Step 6.1                    | everything + `/admin/admins`, `/admin/schools`, `/admin/teachers`          |


To change someone's role later (SQL editor or as a super admin):

```sql
update public.profiles set role = 'teacher' where email = 'person@school.ma';
```

---



## Step 7 — Tests (catalogue)

All 35 tests are already inserted by `setup.sql`, section 8. Nothing else to do.

To **hide** a test from students:

```sql
update public.tests set is_active = false where id = 'test-processing-speed';
```

To **add a new test**:

1. Code: follow the checklist in `docs/PROJECT-OVERVIEW.md` [§6](PROJECT-OVERVIEW.md) (component, `TEST_ID`, `mockTests`, early return in `app/tests/[testId]/page.tsx`).
2. Database: add a line to section 8 of `supabase/setup.sql`, e.g.
  ```sql
   ('test-my-new-test', 'My New Test', 'cognitive-capacity', 'CogniTest catalogue', true),
  ```
   then re-run the whole file in the SQL editor. This is safe: existing data is kept.

Domain values in use: `cognitive-capacity`, `cognition-geometrie`.

---



## Step 8 — Deploy on Netlify

1. Netlify → **Site configuration → Environment variables → Add a variable**, for each:

  | Key                                    | Value                               | Notes                                                                          |
  | -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
  | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co` | scopes: **All**                                                                |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…`                  | scopes: **All**                                                                |
  | `SUPABASE_SECRET_KEY`                  | `sb_secret_…`                       | check **Contains secret values**; scopes: **Functions** + **Runtime** (or All) |
  | `NEXT_PUBLIC_SITE_URL`                 | `https://your-site.netlify.app`     | scopes: **All**                                                                |

2. Remove any old variables from the previous project (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). The app falls back to them when the new ones are missing, which would silently point to the old project.
3. **Deploys → Trigger deploy → Clear cache and deploy site.** `NEXT_PUBLIC_`* values are baked in at build time, so a rebuild is mandatory after any change.
4. In Supabase **Authentication → URL Configuration**, set the **Site URL** to the Netlify URL (Step 3).

`netlify.toml` already tells Netlify's secret scanner that the `NEXT_PUBLIC_*` Supabase values are meant to be public.

---



## Step 9 — Final checks

1. **Anonymous access is blocked.** Replace the two values and run in a terminal:
  ```bash
   curl "https://<project-ref>.supabase.co/rest/v1/profiles?select=*" \
     -H "apikey: sb_publishable_..."
  ```
   Expected: `"code":"42501"` / `permission denied`. If you get a JSON list of users, Step 2 did not run.
2. **App flow:**
  - Sign in as the super admin → `/admin` loads.
  - Register a student → finish a test → Dashboard → **Table Editor →** `test_sessions` shows the new row.
  - Sign in as the student's teacher → the student and their score appear on `/teacher/dashboard`.
  - As the student, open `/admin` → you are redirected away.

---



## Troubleshooting


| Symptom                                                                         | Cause / fix                                                                                                                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| *"Your project's URL and Key are required to create a Supabase client"*         | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were not set when the app was **built**. Set them, then *Clear cache and deploy*. |
| Page shows *"Server misconfigured: Supabase environment variables are missing"* | Same as above.                                                                                                                                        |
| `/api/schools` or `/api/teachers` returns 500                                   | `SUPABASE_SECRET_KEY` is missing or wrong on the server.                                                                                              |
| *"Foreign key violation (missing tests row…)"*                                  | A test id is not in `public.tests` → add it to section 8 of `setup.sql` and re-run.                                                                   |
| Login works but user lands on the student dashboard                             | Their role is still `student` → `update public.profiles set role = … where email = …`.                                                                |
| *"Only a super admin can change roles"*                                         | Expected: role changes need a super admin (or the SQL editor).                                                                                        |
| *"teacher_id must reference a teacher profile"*                                 | The student picked an account that is not a teacher.                                                                                                  |
| Teacher register form has no schools                                            | Create a school first (Step 6.2).                                                                                                                     |
| Confirmation emails don't arrive                                                | Built-in mailer rate limit → configure SMTP (Step 3).                                                                                                 |
| *"permission denied for table …"* for a signed-in user                          | `setup.sql` not run (or run on another project). Run it again.                                                                                        |


