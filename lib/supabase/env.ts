/**
 * Public Supabase URL + anon/publishable key.
 * Newer dashboard copies use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 * this app historically uses NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ''
  )
}

/** Server-only privileged key (legacy JWT or new `sb_secret_…`). */
export function getSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ''
  )
}
