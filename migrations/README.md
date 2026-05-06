# Database migrations (CogniTest)

PostgreSQL **14+** baseline and numbered change scripts. Use this folder as the single place to add **new** DDL/DML requirements.

## Apply a fresh database

1. Create an empty database on your provider (Supabase, Neon, RDS, Cloud SQL, local Postgres, etc.).
2. Run **`0001_baseline.sql`** end-to-end in the SQL editor or via `psql -f migrations/0001_baseline.sql`.
3. Optionally load catalogue data from `supabase/seed.sql` if you use it.

## Portability notes

| Topic | Detail |
|--------|--------|
| **Auth** | Baseline assumes **Supabase Auth**: `auth.users`, `auth.uid()`, JWT role `authenticated`. Other hosts must expose the same (or replace `profiles.id` FK and triggers — see header in `0001_baseline.sql`). |
| **Extensions** | `pgcrypto` (and optionally `uuid-ossp`) must be allowed by the provider. |
| **RLS** | Policies use `auth.uid()` and `auth.role() = 'authenticated'`. Align with your provider’s JWT/session variables. |

## Naming convention for new scripts

Use zero-padded order + short description:

```text
0002_add_foo_column.sql
0003_create_audit_table.sql
```

Rules:

- **Idempotent where possible** (`if not exists`, `drop policy if exists`, etc.) so re-runs fail safely or no-op.
- One logical change per file (easier review and rollbacks).
- Document **dependencies** (e.g. “requires `0001_baseline.sql`”) in a file header comment.

## Keeping parity with `supabase/`

The repo historically split DDL into `supabase/schema.sql` and `supabase/policies.sql`. **`0001_baseline.sql`** is the **merged** runnable template. When you change the schema:

- Either update `supabase/schema.sql` + `supabase/policies.sql` and **re-merge** into `0001_baseline.sql`, **or**
- Add a **new** numbered migration only (preferred for incremental changes) and treat `0001` as the frozen bootstrap for *new* environments.

For **existing** production DBs, prefer **incremental** files (`0002_…`) rather than re-applying `0001`.
