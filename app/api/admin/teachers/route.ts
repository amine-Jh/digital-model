/**
 * Super-admin: list teachers (with school) and create a teacher account.
 *
 * POST body: { email, password, fullName?, schoolId: uuid }
 */
import { NextResponse } from 'next/server'
import { getSupabaseServer, tryGetSupabaseAdmin } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/api/require-super-admin'

export async function GET() {
  const gate = await requireSuperAdmin()
  if ('response' in gate) return gate.response

  try {
    const sb = await getSupabaseServer()
    const { data: teachers, error: tErr } = await sb
      .from('profiles')
      .select('id, email, full_name, school_id, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 })
    }

    const schoolIds = [...new Set((teachers ?? []).map((t) => t.school_id).filter(Boolean))] as string[]
    const schoolMap = new Map<string, { name: string; city: string | null }>()
    if (schoolIds.length > 0) {
      const { data: schools } = await sb.from('schools').select('id, name, city').in('id', schoolIds)
      for (const s of schools ?? []) {
        schoolMap.set(s.id, { name: s.name, city: s.city })
      }
    }

    const rows = (teachers ?? []).map((t) => ({
      ...t,
      school: t.school_id ? schoolMap.get(t.school_id) ?? null : null,
    }))

    return NextResponse.json({ teachers: rows })
  } catch (e) {
    console.error('[admin/teachers GET]', e)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
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
    const schoolId = String(body.schoolId ?? '').trim()

    if (!email.includes('@') || password.length < 8) {
      return NextResponse.json(
        { error: 'E-mail valide et mot de passe (min. 8 caractères) requis.' },
        { status: 400 },
      )
    }
    if (!schoolId) {
      return NextResponse.json({ error: 'L’établissement est requis.' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    const { data: school, error: sErr } = await sb
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .eq('is_active', true)
      .maybeSingle()

    if (sErr || !school) {
      return NextResponse.json({ error: 'Établissement invalide ou inactif.' }, { status: 400 })
    }

    const svc = tryGetSupabaseAdmin()
    if (!svc) {
      return NextResponse.json(
        {
          error:
            'Creating teachers requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) on the server.',
        },
        { status: 503 },
      )
    }
    const { data, error } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'teacher',
        full_name: fullName,
        school_id: schoolId,
      },
    })

    if (error || !data.user) {
      const status = error?.message?.toLowerCase().includes('already') ? 409 : 400
      return NextResponse.json({ error: error?.message ?? 'Échec de la création.' }, { status })
    }

    const { error: upErr } = await svc
      .from('profiles')
      .update({
        role: 'teacher',
        full_name: fullName || null,
        school_id: schoolId,
      })
      .eq('id', data.user.id)

    if (upErr) {
      console.error('[admin/teachers POST] profile', upErr)
      return NextResponse.json(
        { error: 'Compte créé mais mise à jour du profil échouée.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        role: 'teacher' as const,
        school_id: schoolId,
      },
    })
  } catch (e) {
    console.error('[admin/teachers POST]', e)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}
