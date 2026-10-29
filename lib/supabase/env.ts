/**
 * Supabase environment resolution (shared by browser, middleware and server code).
 *
 * Preferred variables (new Supabase API keys):
 *   NEXT_PUBLIC_SUPABASE_URL              — project URL (browser + server)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — `sb_publishable_…` (browser + server, RLS applies)
 *   SUPABASE_SECRET_KEY                   — `sb_secret_…` (server only, bypasses RLS)
 *
 * Legacy fallbacks: NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL.
 *
 * Getters return '' when unset so callers can fail with a clear message instead
 * of crashing. `NEXT_PUBLIC_*` must be read with literal `process.env.NEXT_PUBLIC_…`
 * access so Next.js can inline them into the client bundle at build time.
 */

export const SUPABASE_ENV_MISSING_MESSAGE =
  'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set them in .env.local (dev) or in the host build environment (Netlify), then redeploy.'

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || ''
  // The clients append /rest/v1, /auth/v1… themselves; a pasted REST endpoint would double it (PGRST125).
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  )
}

/** Server-only privileged key (new `sb_secret_…` or legacy service_role JWT). */
export function getSupabaseSecretKey(): string {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
}
