# Database migrations (CogniTest)

All **versioned** PostgreSQL changes for this project live in **`supabase/migrations/`**. Add a new file whenever the database schema, policies, or seed-related DDL needs to change, so history stays reviewable and reproducible.

## Naming

Use a **zero-padded sequence number** plus a short snake-case description:

```text
0001_baseline.sql
0002_super_admin.sql
0007_add_notifications_table.sql
```

Rules:

- **One logical change per file** (easier review and rollbacks).
- Prefer **idempotent** SQL (`if not exists`, `drop policy if exists`, guarded `DO $$` blocks) so re-runs fail safely or no-op.
- Document **dependencies** in the file header (e.g. “requires `test_sessions` from 0001”).

## Apply order

On a **new** database (empty Postgres with Supabase Auth):

1. Run **`0001_baseline.sql`** end-to-end (merged schema + RLS from the historical split).
2. Run all later numbered migrations (**`0002_` … latest**) in numeric order if your baseline predates those patches (most are idempotent; skip any that already match your DB).
3. Run **`supabase/seed.sql`** if you need catalogue rows (after schema/RLS).

On an **existing** production database that was created from older `schema.sql` / `policies.sql` only:

- Prefer applying only the **incremental** files you are missing (e.g. `0005_geometry_session_analytics.sql`, `0006_students_compat.sql`), not re-applying `0001` wholesale.

## Relationship to `supabase/schema.sql` and `supabase/policies.sql`

The repo still maintains **`supabase/schema.sql`** and **`supabase/policies.sql`** as the human-editable split. When they change, either:

- regenerate or refresh **`0001_baseline.sql`** for greenfield installs, **or**
- add a **new** numbered migration (`0007_…`) for production and leave `0001` as the last merged snapshot you trust.

## Template

Copy **`9999_TEMPLATE.sql.example`** to the next free number (e.g. `0007_your_change.sql`), replace the placeholder, and open a PR.

## Supabase CLI (optional)

If you later add `supabase config.toml`, you can align filenames with the CLI convention (`YYYYMMDDHHMMSS_name.sql`). Until then, numeric `NNNN_` ordering is the source of truth in this repo.
