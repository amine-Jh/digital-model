/**
 * Super-admin only: list platform admins (`admin` + `super_admin`) and create `admin` accounts.
 *
 * POST body: { email: string, password: string, fullName?: string }
 */
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/api/require-super-admin'

export async function GET() {
  const gate = await requireSuperAdmin()
  if ('response' in gate) return gate.response

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('id,email,full_name,role,created_at')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ admins: data ?? [] })
  } catch (e) {
    console.error('[platform-admins GET]', e)
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await requireSuperAdmin()
  if ('response' in gate) return gate.response

  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const fullName = body.fullName ? String(body.fullName).trim() : ''

    if (!email.includes('@') || password.length < 8) {
      return NextResponse.json(
        { error: 'A valid email and password (min 8 characters) are required.' },
        { status: 400 },
      )
    }

    const svc = getSupabaseAdmin()
    const { data, error } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: fullName },
    })

    if (error || !data.user) {
      const status = error?.message?.toLowerCase().includes('already') ? 409 : 400
      return NextResponse.json({ error: error?.message ?? 'Failed to create user.' }, { status })
    }

    const { error: upErr } = await svc
      .from('profiles')
      .update({ role: 'admin', full_name: fullName || null })
      .eq('id', data.user.id)

    if (upErr) {
      console.error('[platform-admins POST] profile update', upErr)
      return NextResponse.json(
        { error: 'User created but profile role update failed. Fix in Supabase dashboard.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email ?? email, role: 'admin' as const },
    })
  } catch (e) {
    console.error('[platform-admins POST]', e)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}
