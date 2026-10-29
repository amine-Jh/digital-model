/**
 * GET /api/teachers?schoolId=uuid
 *
 * Teachers in the directory (signed-in user + RLS `profiles_teacher_directory`).
 * When `schoolId` is set, only teachers assigned to that school are returned.
 */
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { TeacherDirectoryEntry } from '@/lib/teacher-directory'

export async function GET(request: Request) {
  const sb = await getSupabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('schoolId')?.trim() || null

  try {
    let q = sb.from('profiles').select('id, email, full_name, school_id').eq('role', 'teacher')
    if (schoolId) {
      q = q.eq('school_id', schoolId)
    }
    const { data, error } = await q

    if (error) {
      console.error('[teachers GET]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teachers: TeacherDirectoryEntry[] = (data ?? []).map((r) => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      school_id: r.school_id,
    }))

    teachers.sort((a, b) => {
      const la = (a.full_name?.trim() || a.email).localeCompare(b.full_name?.trim() || b.email, 'fr', {
        sensitivity: 'base',
      })
      if (la !== 0) return la
      return a.email.localeCompare(b.email, 'fr', { sensitivity: 'base' })
    })

    return NextResponse.json({ teachers })
  } catch (e) {
    console.error('[teachers GET]', e)
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }
}
