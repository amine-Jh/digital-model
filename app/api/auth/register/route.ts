/**
 * POST /api/auth/register
 *
 * Creates an account via Supabase Auth signUp (anon/publishable key).
 * The handle_new_user() trigger creates public.profiles.
 *
 * Body:
 *   {
 *     username: string,        // email (kept name for back-compat)
 *     password: string,
 *     role: 'student' | 'teacher',
 *     firstName?: string,
 *     lastName?: string,
 *     schoolId?: string,       // required conceptually for teachers
 *   }
 */
import { NextResponse } from 'next/server'
import { getSupabasePublic } from '@/lib/supabase/server'
import { isValidAuthEmail, normalizeAuthEmail } from '@/lib/auth-email'
import type { UserRole } from '@/lib/auth-types'

const VALID_ROLES: UserRole[] = ['student', 'teacher']

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeAuthEmail(String(body.username ?? body.email ?? ''))
    const password = String(body.password ?? '')
    const role = (body.role ?? 'student') as UserRole
    const firstName = body.firstName ? String(body.firstName).trim() : ''
    const lastName = body.lastName ? String(body.lastName).trim() : ''
    const schoolId = body.schoolId ? String(body.schoolId).trim() : ''

    if (!isValidAuthEmail(email) || password.length < 6) {
      return NextResponse.json(
        { error: 'A valid email and a password (min 6 chars) are required.' },
        { status: 400 },
      )
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    const meta: Record<string, string> = { role, full_name: fullName }
    if (role === 'teacher' && schoolId) {
      meta.school_id = schoolId
    }

    const sb = getSupabasePublic()
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: meta },
    })

    if (error || !data.user) {
      const status = error?.message?.toLowerCase().includes('already') ? 409 : 400
      return NextResponse.json(
        { error: error?.message ?? 'Registration failed.' },
        { status },
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        username: data.user.email ?? email,
        role,
      },
      needsEmailConfirmation: !data.session,
    })
  } catch (err) {
    console.error('[auth/register]', err)
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 })
  }
}
