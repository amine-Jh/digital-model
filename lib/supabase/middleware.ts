/**
 * Session-refresh middleware.
 *
 * Runs on every request, refreshes the Supabase session cookie if it's
 * expiring, and guards the routes listed in PROTECTED_PREFIXES. Imported
 * by the root `proxy.ts` (Next.js proxy convention).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

const PROTECTED_PREFIXES = [
  '/profile',
  '/profile-setup',
  '/tests',
  '/results',
  '/teacher',
  '/admin',
  '/analytics',
]

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    console.error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). See .env.example.',
    )
    return response
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(toSet) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refresh the session — must be the first DB call after createServerClient.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p))

  if (needsAuth && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // `/` is the login gate — never redirect it. `/register` stays reachable.

  return response
}
