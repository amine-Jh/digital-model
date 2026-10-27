/**
 * /api/student-profile
 *
 *   GET  ?userId=…   → fetch a student profile (RLS scopes the read).
 *                      If userId is omitted, returns the caller's profile.
 *   PUT              → upsert the caller's profile (auth user id is taken
 *                      from the session; the request body cannot pretend
 *                      to be someone else).
 *
 * Backed by public.student_profiles. NO local student-profiles.json.
 */
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { StudentAcademicProfile } from '@/lib/student-profile-types'
import type { Database } from '@/lib/types/database'

type Row = Database['public']['Tables']['student_profiles']['Row']

function rowToProfile(row: Row | null): StudentAcademicProfile | null {
  if (!row) return null
  return {
    userId: row.user_id,
    fullName: row.full_name ?? '',
    age: row.age ?? 0,
    gender: row.gender ?? '',
    teacherId: row.teacher_id ?? null,
    teacherName: row.teacher_name ?? '',
    schoolName: row.school_name ?? '',
    gradeLevel: (row.grade_level ?? '3ème année collège') as StudentAcademicProfile['gradeLevel'],
    academicTrack: (row.academic_track ?? '') as StudentAcademicProfile['academicTrack'],
    academicYear: row.academic_year ?? '',
    mathAverage2024_2025: row.math_average_2024_2025 ?? null,
    mathAverage2025_2026: row.math_average_2025_2026 ?? null,
    updatedAt: row.updated_at,
  }
}

export async function GET(request: Request) {
  const sb = await getSupabaseServer()
  const { searchParams } = new URL(request.url)
  const requested = searchParams.get('userId')

  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const targetId = requested ?? user.id
  const { data, error } = await sb
    .from('student_profiles')
    .select('*')
    .eq('user_id', targetId)
    .maybeSingle()

  if (error) {
    console.error('[student-profile GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ profile: rowToProfile(data) })
}

export async function PUT(request: Request) {
  const sb = await getSupabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = (await request.json()) as Partial<StudentAcademicProfile> & {
      teacherId?: string | null
      schoolId?: string | null
    }

    const rawSid =
      typeof body.schoolId === 'string' && body.schoolId.trim() !== '' ? body.schoolId.trim() : null
    if (!rawSid) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner l’établissement scolaire.' },
        { status: 400 },
      )
    }

    const rawTid = body.teacherId
    const teacherId =
      typeof rawTid === 'string' && rawTid.trim() !== '' ? rawTid.trim() : null

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un enseignant dans la liste.' },
        { status: 400 },
      )
    }

    const { data: schoolRow, error: schoolErr } = await sb
      .from('schools')
      .select('id, name')
      .eq('id', rawSid)
      .eq('is_active', true)
      .maybeSingle()

    if (schoolErr || !schoolRow) {
      return NextResponse.json({ error: 'Établissement introuvable ou inactif.' }, { status: 400 })
    }

    const { data: teacherRow, error: teacherErr } = await sb
      .from('profiles')
      .select('id, full_name, email, school_id')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle()

    if (teacherErr || !teacherRow) {
      return NextResponse.json({ error: 'Enseignant introuvable ou invalide.' }, { status: 400 })
    }

    if (teacherRow.school_id !== rawSid) {
      return NextResponse.json(
        { error: 'Cet enseignant n’appartient pas à l’établissement sélectionné.' },
        { status: 400 },
      )
    }

    const teacherLabel =
      (typeof teacherRow.full_name === 'string' && teacherRow.full_name.trim() !== ''
        ? teacherRow.full_name.trim()
        : null) ?? teacherRow.email

    const upsert: Database['public']['Tables']['student_profiles']['Insert'] = {
      user_id: user.id, // Always force the caller's own id; never trust the body.
      full_name: body.fullName ?? null,
      age: typeof body.age === 'number' ? body.age : null,
      gender: (body.gender ?? '') as Row['gender'],
      teacher_id: teacherId,
      teacher_name: teacherLabel,
      school_name: schoolRow.name,
      grade_level: (body.gradeLevel ?? null) as Row['grade_level'],
      academic_track: body.academicTrack ?? null,
      academic_year: body.academicYear ?? null,
      math_average_2024_2025:
        typeof body.mathAverage2024_2025 === 'number' ? body.mathAverage2024_2025 : null,
      math_average_2025_2026:
        typeof body.mathAverage2025_2026 === 'number' ? body.mathAverage2025_2026 : null,
    }

    const { error } = await sb
      .from('student_profiles')
      .upsert(upsert, { onConflict: 'user_id' })

    if (error) {
      console.error('[student-profile PUT]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[student-profile PUT]', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
