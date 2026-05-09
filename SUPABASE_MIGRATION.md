# Supabase migration runbook

This document is the canonical guide to move CogniTest from the Next.js
`/api/auth/*` + JSON-store + `localStorage` setup to a production-ready
Supabase backend. Files referenced below already exist in the repo — you
just need to wire them up to a real Supabase project.

---

## 1 · Architecture overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ Next.js 16 (App Router, RSC)                                           │
│                                                                        │
│  components/  ──── 'use client' UI                                     │
│  app/         ──── Server Components + Route Handlers                  │
│      ↑                                                                 │
│      └── lib/supabase/server.ts   (cookie-bound client)                │
│      └── lib/supabase/client.ts   (browser singleton)                  │
│      └── proxy.ts                 (session refresh + route guard)        │
└────────────────────────────────────────────────────────────────────────┘
                                │ HTTPS (anon JWT in cookie)
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Supabase                                                               │
│   • Auth (email/password, optional OAuth)                              │
│   • Postgres   ── tables in supabase/schema.sql                        │
│   • RLS        ── policies in supabase/policies.sql                    │
│   • Migrations ── versioned DDL in supabase/migrations/ (see README)   │
│   • Storage    ── (optional) test images                               │
└────────────────────────────────────────────────────────────────────────┘
```

Core principles:

* **No business logic in API routes.** Every read/write goes through the
  Supabase client with RLS doing the authorisation. The only Route Handlers
  we keep are integration callbacks (e.g. `/api/auth/callback` for OAuth).
* **Cookies, not localStorage.** Sessions are HTTP-only, signed cookies.
  Root `proxy.ts` refreshes them on every request.
* **One source of truth per concept.** A test session lives in
  `test_sessions`; per-question rows in `trial_results`. The legacy
  per-test localStorage helpers are deprecated.

---

## 2 · Provision Supabase

1. **Create the project.** [supabase.com](https://supabase.com) → New project.
   Pick the region closest to your users.
2. **Apply migrations (recommended).** Open `supabase/migrations/README.md`,
   then in SQL Editor run **`0001_baseline.sql`**, then **`0002_` … `0005_`**
   in numeric order as needed (each file header states dependencies).
3. **Alternative (split files).** Paste `supabase/schema.sql` → Run, then
   `supabase/policies.sql` → Run (kept in sync with the baseline for editing).
4. **Seed the catalogue.** Same flow with `supabase/seed.sql`.
5. **Auth settings.** Authentication → Settings:
   * Disable confirmation emails for local dev (re-enable in prod).
   * Add `http://localhost:3000` and your prod domain to *Site URL* +
     *Additional Redirect URLs*.
6. **(Optional) Storage.** If you want to host the test images in Supabase
   instead of `/public`, create a public bucket `test-assets` and upload
   under `geometry/<test-id>/<file>`. Update `imagePath` references.

---

## 3 · Wire the Next.js app

```bash
npm install @supabase/supabase-js @supabase/ssr
cp .env.example .env.local        # then fill in URLs + keys
```

Files already in the repo:

| Path                                | Purpose                                                  |
|-------------------------------------|----------------------------------------------------------|
| `lib/supabase/client.ts`            | Browser singleton — use from `'use client'` components   |
| `lib/supabase/server.ts`            | Cookie-bound server client + privileged admin client     |
| `lib/supabase/middleware.ts`        | Session refresh + route guard helper (`updateSupabaseSession`) |
| `proxy.ts`                          | Wires the helper to the Next.js **proxy** pipeline       |
| `lib/types/database.ts`             | DB types — regenerate with the Supabase CLI when ready   |
| `supabase/migrations/README.md`     | Versioned DDL: run `0001_…` then incremental `NNNN_…`    |
| `lib/auth-context.tsx`              | Auth context, now backed by `signInWithPassword`         |
| `lib/results/results-service.ts`    | `startSession()` / `finishSession()` / `listMySessions()`|
| `lib/analytics/queries.ts`          | Server-side analytics fetchers                           |
| `lib/geometry/geo-vectors-supabase.ts` | Exemplar bridge: localStorage → test_sessions         |

### Regenerate strict types (optional but recommended)

```bash
npx supabase login
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  > lib/types/database.ts
```

---

## 4 · Migrate quizzes one at a time

The example bridge for the Vectors quiz is `lib/geometry/geo-vectors-supabase.ts`.
For each remaining quiz:

```ts
// in components/<test>/<test>-quiz.tsx Results step
import { persistVectorsAttempt } from '@/lib/geometry/geo-vectors-supabase'
//                ^^^ replace with the per-test helper you create

useEffect(() => {
  if (phase !== 'done' || trials.length === 0) return
  persistVectorsAttempt({
    trials,
    totalMs: Date.now() - startedAt,
    scorePercent: computedFinalPercent,
    correctCount: scorable.filter(t => t.correct).length,
  }).catch(console.error)
}, [phase, trials, startedAt])
```

Existing `localStorage`-based helpers (`saveVectorsResult`,
`saveSymetrieAxialeResult`, `saveProduitScalaireResult`, …) can keep
running in parallel during the cut-over. Once every page reads from
Supabase, delete them.

---

## 5 · Authentication & authorisation

The `useAuth()` API is unchanged for callers:

```ts
const { user, loading, login, register, logout } = useAuth()
await login(email, password)        // signInWithPassword
await register(email, password, 'student', 'Full Name')
await logout()                      // signOut + cookie clear
```

Roles:

| Role     | Reads                                                       | Writes                                              |
|----------|-------------------------------------------------------------|-----------------------------------------------------|
| student  | own profile, own sessions / trials, tests catalogue         | own profile, own sessions / trials                  |
| teacher  | + students with `student_profiles.teacher_id = self`        | (no writes outside own profile)                     |
| admin    | everything                                                  | tests catalogue, questions, any profile             |

A user's role is in `public.profiles.role`. Set it via the Supabase dashboard
or by passing `options.data.role` at sign-up — that ends up in
`auth.users.raw_user_meta_data` and is picked up by the `handle_new_user()`
trigger.

To assign a teacher to a student:

```sql
update public.student_profiles
   set teacher_id = '<teacher-uuid>'
 where user_id    = '<student-uuid>';
```

---

## 6 · Server Components vs. Client Components

Rule of thumb:

* **Read** in a Server Component (`lib/analytics/queries.ts` patterns) —
  no waterfalls, no flicker, no client bundle bloat.
* **Write** from a Client Component or a Server Action — both go through
  RLS so you can't sidestep authorisation.

Example dashboard page:

```tsx
// app/dashboard/page.tsx
import { ProgressionChart } from '@/components/analytics/progression-chart'
import { getMyProgression, getMyTestAverages } from '@/lib/analytics/queries'

export default async function DashboardPage() {
  const [progression, averages] = await Promise.all([
    getMyProgression(),
    getMyTestAverages(),
  ])
  return (
    <main>
      <ProgressionChart data={progression} />
      {/* render averages */}
    </main>
  )
}
```

---

## 7 · Error handling & observability

* **Async correctness.** Every Supabase call returns `{ data, error }`. Treat
  `error` as a real error path — log + surface a toast, never swallow.
* **Boundary.** Wrap each route group with an `error.tsx` boundary so a bad
  query doesn't take down the layout.
* **Logging.** Server Components log to the platform logs (Vercel/Netlify
  function logs). For long-running cron jobs use Supabase Edge Functions or
  a separate logger (e.g. Logtail).
* **Type safety.** Once you regenerate `lib/types/database.ts`, every query
  is exhaustively typed — column renames break compilation.

---

## 8 · Deployment

### Vercel (recommended)

1. Import the repo.
2. Add the env vars from `.env.example` under *Project → Settings → Environment Variables*.
3. Set the Production *Site URL* in Supabase Auth to match the Vercel domain.
4. Trigger a production deploy.

Why Vercel over Netlify: the Next.js 16 App Router and edge **proxy** have
first-class support on Vercel; Netlify supports them but the cold-start
behaviour and the streaming RSC pipeline are less battle-tested, which is
the source of the 500s reported in the brief.

### Netlify (if mandatory)

* Use the official `@netlify/plugin-nextjs` adapter.
* In Netlify env vars, set the same three `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
* Add a `[functions] node_bundler = "esbuild"` block to `netlify.toml`.

---

## 9 · Suggested follow-ups

**Performance**

* Add `created_at` indexes already declared in `schema.sql` (done).
* Materialize `metrics` nightly with a cron-triggered Supabase Edge
  Function — much cheaper than aggregating sessions on every dashboard
  load when the cohort grows.
* Use `select(... { count: 'exact', head: true })` for counters instead
  of fetching rows.

**Analytics for research**

* Add a `cohorts` table (`id`, `name`, `created_by`) with a join table
  `cohort_members` so researchers can group students for longitudinal
  comparisons independently of the teacher relationship.
* Capture `client_info` (UA, screen size, locale) in `test_sessions.metadata`
  for population-level controls.
* Export raw `trial_results` as CSV via a Server Action that double-checks
  the caller is admin.

**Hardening**

* Rotate the service-role key after first prod deploy.
* Add Captcha (hCaptcha or Turnstile) on `/register` to prevent abuse.
* Schedule daily backups (Supabase → Database → Backups).
