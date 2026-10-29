/**
 * Supabase environment resolution (shared by browser, proxy and server code).
 *
 * Preferred variables (new Supabase API keys):
 *   NEXT_PUBLIC_SUPABASE_URL              — project URL (browser + server)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — `sb_publishable_…` (browser + server, RLS applies)
 *   SUPABASE_SECRET_KEY                   — `sb_secret_…` (server only, bypasses RLS)
 *
 * Legacy fallbacks: NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL.
 *
 * `NEXT_PUBLIC_*` must be read with literal `process.env.NEXT_PUBLIC_…` access so
 * Next.js can inline them into the client bundle at build time.
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local (dev) or in your host’s build environment, then rebuild.',
    )
  }
  // The clients append /rest/v1, /auth/v1… themselves; a pasted REST endpoint would double it (PGRST125).
  return url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local (dev) or in your host’s build environment, then rebuild.',
    )
  }
  return key
}

/** Server-only. Returns null when no privileged key is configured. */
export function getSupabaseSecretKey(): string | null {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}
