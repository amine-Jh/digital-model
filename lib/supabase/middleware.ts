/**
 * Session-refresh middleware.
 *
 * Runs on every matched request, refreshes the Supabase session cookie if
 * it's expiring, guards PROTECTED_PREFIXES, and enforces ROLE_RULES (role is
 * read from `public.profiles`, never from user-editable auth metadata).
 * Imported by the root `proxy.ts` (Next.js proxy convention).
 *
 * This is a navigation guard only — data access is enforced by RLS and by
 * the Route Handlers.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database, UserRole } from '@/lib/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/profile-setup',
  '/tests',
  '/results',
  '/domains',
  '/teacher',
  '/admin',
  '/analytics',
  '/reports',
]

const STAFF: UserRole[] = ['teacher', 'admin', 'super_admin']
const ADMINS: UserRole[] = ['admin', 'super_admin']

/** First matching prefix wins — keep the most specific prefixes first. */
const ROLE_RULES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/admin/admins', roles: ['super_admin'] },
  { prefix: '/admin/schools', roles: ['super_admin'] },
  { prefix: '/admin/teachers', roles: ['super_admin'] },
  { prefix: '/admin', roles: ADMINS },
  { prefix: '/teacher', roles: STAFF },
  { prefix: '/analytics', roles: STAFF },
  { prefix: '/reports', roles: STAFF },
]

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  let url: string
  let key: string
  try {
    url = getSupabaseUrl()
    key = getSupabasePublishableKey()
  } catch (e) {
    console.error('[proxy]', e instanceof Error ? e.message : e)
    return new NextResponse('Server misconfigured: Supabase environment variables are missing.', {
      status: 500,
    })
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

  // Must run right after createServerClient: refreshes the session and
  // verifies the JWT signature (locally via JWKS for asymmetric keys).
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null

  const path = request.nextUrl.pathname

  const redirectTo = (pathname: string, withReturnPath = false) => {
    const target = request.nextUrl.clone()
    target.pathname = pathname
    target.search = ''
    if (withReturnPath) target.searchParams.set('redirect', path)
    const res = NextResponse.redirect(target)
    // Keep any refreshed auth cookies on the redirect response.
    for (const c of response.cookies.getAll()) res.cookies.set(c)
    return res
  }

  if (!userId) {
    return PROTECTED_PREFIXES.some((p) => matchesPrefix(path, p)) ? redirectTo('/', true) : response
  }

  const rule = ROLE_RULES.find((r) => matchesPrefix(path, r.prefix))
  if (rule) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (!profile?.role || !rule.roles.includes(profile.role)) {
      return redirectTo('/')
    }
  }

  // Already-authed users hitting register → bounce to dashboard (landing `/` stays usable).
  if (path === '/register') {
    return redirectTo('/dashboard')
  }

  return response
}
