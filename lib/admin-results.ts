/**
 * Admin-only aggregates: students, profiles, and `test_sessions` via Supabase
 * browser client (RLS: admin policies on profiles / test_sessions).
 */

import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { platformDomains } from '@/lib/platform-domains'
import { VP_SUBTESTS } from '@/lib/visuo-perceptive'
import { latestSessionByTestId } from '@/lib/student-test-progress'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type SessionRow = Database['public']['Tables']['test_sessions']['Row']

export type AdminCapacityBreakdown = Record<
  string,
  { earned: number; max: number; percent?: number }
>

export type AdminStudentSummary = {
  id: string
  name: string
  email: string
  filiere: string
  level: string
  groupId: string
  teacherName: string
  institutionId: string
  testScores: Record<string, number>
  /** Latest session with `metadata.capacityBreakdown` (geometry Cₖ payload). */
  capacityByTest?: Record<
    string,
    {
      completedAt: string | null
      unit: 'fraction' | 'points'
      breakdown: AdminCapacityBreakdown
    }
  >
}

export function domainAverageForAdminStudent(
  student: AdminStudentSummary,
  domainId: string,
): number {
  const d = platformDomains.find((x) => x.id === domainId)
  if (!d) return 0
  let testIds = d.subdomains.flatMap((s) => s.capacities.map((c) => c.testId))
  if (domainId === 'visual-processing') {
    testIds = VP_SUBTESTS.map((s) => s.testId)
  }
  const vals = testIds
    .map((tid) => student.testScores[tid])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v) && v >= 0)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export async function fetchAdminResultsData(): Promise<{
  students: AdminStudentSummary[]
  sessions: SessionRow[]
  error: string | null
}> {
  const sb = getSupabaseBrowser()

  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'student')
    .order('email', { ascending: true })

  if (pErr) {
    return { students: [], sessions: [], error: pErr.message }
  }

  const { data: sProfiles, error: spErr } = await sb.from('student_profiles').select('*')
  if (spErr) {
    return { students: [], sessions: [], error: spErr.message }
  }

  const { data: sessions, error: sErr } = await sb
    .from('test_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(8000)

  if (sErr) {
    return { students: [], sessions: [], error: sErr.message }
  }

  const studentRows = (profiles ?? []) as ProfileRow[]
  const spList = (sProfiles ?? []) as StudentProfileRow[]
  const spByUser = new Map(spList.map((r) => [r.user_id, r]))
  const sess = (sessions ?? []) as SessionRow[]

  const byUser = new Map<string, SessionRow[]>()
  for (const row of sess) {
    const arr = byUser.get(row.user_id) ?? []
    arr.push(row)
    byUser.set(row.user_id, arr)
  }

  const teacherIds = [
    ...new Set(spList.map((r) => r.teacher_id).filter((x): x is string => Boolean(x))),
  ]
  const teacherNames = new Map<string, string>()
  if (teacherIds.length > 0) {
    const { data: teachers } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', teacherIds)
    for (const t of teachers ?? []) {
      const id = t.id as string
      const nm = ((t.full_name as string | null) ?? '').trim()
      const em = (t.email as string) ?? ''
      teacherNames.set(id, nm || em || id)
    }
  }

  const students: AdminStudentSummary[] = studentRows.map((p) => {
    const sp = spByUser.get(p.id)
    const rows = byUser.get(p.id) ?? []
    const latest = latestSessionByTestId(rows)
    const testScores: Record<string, number> = {}
    const capacityByTest: NonNullable<AdminStudentSummary['capacityByTest']> = {}
    for (const [tid, row] of latest) {
      if (row.status === 'completed' && row.score != null) {
        testScores[tid] = Math.round(Number(row.score))
      } else if (row.status === 'completed' && row.score == null && row.metadata && typeof row.metadata === 'object') {
        const meta = row.metadata as Record<string, unknown>
        if (meta.pendingAdminValidation === true) {
          testScores[tid] = -1
        }
      }
      if (row.status === 'completed' && row.metadata && typeof row.metadata === 'object') {
        const meta = row.metadata as Record<string, unknown>
        const br = meta.capacityBreakdown
        if (br && typeof br === 'object' && !Array.isArray(br)) {
          capacityByTest[tid] = {
            completedAt: row.completed_at,
            unit: meta.breakdownUnit === 'points' ? 'points' : 'fraction',
            breakdown: br as AdminCapacityBreakdown,
          }
        }
      }
    }
    const tid = sp?.teacher_id ?? null
    const track = sp?.academic_track?.trim()
    const grade = sp?.grade_level != null ? String(sp.grade_level) : ''
    const school = sp?.school_name?.trim()
    return {
      id: p.id,
      name: (p.full_name as string | null)?.trim() || p.email,
      email: p.email,
      filiere: track || '—',
      level: grade || '—',
      groupId: tid ?? 'none',
      teacherName: tid ? teacherNames.get(tid) ?? '—' : '—',
      institutionId: school || '—',
      testScores,
      capacityByTest: Object.keys(capacityByTest).length > 0 ? capacityByTest : undefined,
    }
  })

  return { students, sessions: sess, error: null }
}
