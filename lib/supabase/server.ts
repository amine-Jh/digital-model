/**
 * Server-side Supabase clients.
 *
 * `getSupabaseServer()` — Server Components, Route Handlers, Server Actions.
 * Uses the publishable key + the auth cookie chain, so RLS sees the signed-in user.
 *
 * `getSupabaseAdmin()` — uses the secret key and BYPASSES RLS. Only call it
 * from trusted server code after an explicit authorization check.
 * `server-only` makes the build fail if this module is ever imported from a
 * Client Component, so the secret key cannot reach the browser bundle.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import {
<<<<<<< Updated upstream
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
=======
  getSupabasePublishableKey,
  getSupabaseSecretKey,
>>>>>>> Stashed changes
  getSupabaseUrl,
} from '@/lib/supabase/env'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
<<<<<<< Updated upstream
  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
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
=======
  return createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options)
>>>>>>> Stashed changes
          }
        } catch {
          // Called from a Server Component — cookies cannot be mutated there.
          // The proxy refreshes the session on the next request anyway.
        }
      },
    },
  })
}

export function hasSupabaseSecretKey(): boolean {
  return getSupabaseSecretKey() !== null
}

<<<<<<< Updated upstream
/** Unprivileged client (anon/publishable key). Public reads + Auth signUp. */
export function getSupabasePublic() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key')
=======
/**
 * Privileged client. Bypasses RLS — only call from secure server contexts
 * (cron, admin Route Handlers protected by a role check, etc.).
 */
export function getSupabaseAdmin() {
  const key = getSupabaseSecretKey()
  if (!key) {
    throw new Error('Missing SUPABASE_SECRET_KEY for admin client')
>>>>>>> Stashed changes
  }
  return createClient<Database>(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

function createServiceRoleClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Privileged client when a service_role / secret key is configured; otherwise null. */
export function tryGetSupabaseAdmin() {
  return createServiceRoleClient()
}

export function getSupabaseAdmin() {
  const client = createServiceRoleClient()
  if (!client) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin client')
  }
  return client
}
