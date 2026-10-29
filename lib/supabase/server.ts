/**
 * Server-side Supabase clients.
 *
 * `getSupabaseServer()` — Server Components, Route Handlers, Server Actions.
 * Uses the publishable key + the auth cookie chain, so RLS sees the signed-in user.
 *
 * `getSupabasePublic()` — publishable key, no session (Auth signUp, public reads).
 *
 * `getSupabaseAdmin()` / `tryGetSupabaseAdmin()` — secret key, BYPASSES RLS.
 * Only call them from trusted server code after an explicit authorization check.
 * `server-only` makes the build fail if this module is ever imported from a
 * Client Component, so the secret key cannot reach the browser bundle.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import {
  SUPABASE_ENV_MISSING_MESSAGE,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from '@/lib/supabase/env'

function requirePublicEnv(): { url: string; key: string } {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key) throw new Error(SUPABASE_ENV_MISSING_MESSAGE)
  return { url, key }
}

export async function getSupabaseServer() {
  const { url, key } = requirePublicEnv()
  const cookieStore = await cookies()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component — cookies cannot be mutated there.
          // The middleware refreshes the session on the next request anyway.
        }
      },
    },
  })
}

/** Unprivileged client (publishable key, no user session). Public reads + Auth signUp. */
export function getSupabasePublic() {
  const { url, key } = requirePublicEnv()
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

/** Privileged client when a secret key is configured; otherwise null. */
export function tryGetSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseSecretKey()
  if (!url || !key) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export function getSupabaseAdmin() {
  const client = tryGetSupabaseAdmin()
  if (!client) {
    throw new Error('Missing SUPABASE_SECRET_KEY for admin client')
  }
  return client
}
