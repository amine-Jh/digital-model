/**
 * Server-side Supabase client.
 *
 * Use this from Server Components, Route Handlers, and Server Actions. It
 * reads/writes the auth cookie chain so RLS policies see the right user.
 *
 * NEVER expose the service-role key to the browser. `getSupabaseAdmin()`
 * below uses it and must only be called from trusted server code (e.g. cron
 * jobs, admin-only mutations).
 */
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/env'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
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
          }
        },
      },
    },
  )
}

/** Unprivileged client (anon/publishable key). Public reads + Auth signUp. */
export function getSupabasePublic() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key')
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
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
