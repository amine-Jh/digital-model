/**
 * Server-side analytics queries.
 *
 * These functions run on the server (Server Components / Route Handlers).
 * They use the cookie-bound Supabase client so RLS sees the right user:
 * a student gets only their own data, a teacher gets their roster, an
 * admin gets everything.
 *
 * Intentionally small + composable: every query returns plain rows, not
 * UI components, so the same fetchers feed both the student dashboard
 * and the teacher cohort views.
 */

import { getSupabaseServer } from '@/lib/supabase/server'

export interface SessionSummary {
  id: string
  test_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  total_questions: number | null
  correct_count: number | null
  total_ms: number | null
}

export async function getMyRecentSessions(limit = 20): Promise<SessionSummary[]> {
  const sb = await getSupabaseServer()
  const { data, error } = await sb
    .from('test_sessions')
    .select(
      'id, test_id, started_at, completed_at, score, total_questions, correct_count, total_ms',
    )
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[analytics] getMyRecentSessions failed:', error.message)
    return []
  }
  return (data ?? []) as SessionSummary[]
}

/** Per-test averages for the current user — used by the student dashboard. */
export interface TestAverage {
  test_id: string
  attempts: number
  avg_score: number
  best_score: number
}

export async function getMyTestAverages(): Promise<TestAverage[]> {
  const sessions = await getMyRecentSessions(500)
  const buckets = new Map<string, { sum: number; n: number; best: number }>()
  for (const s of sessions) {
    if (s.score == null) continue
    const b = buckets.get(s.test_id) ?? { sum: 0, n: 0, best: 0 }
    b.sum += s.score
    b.n += 1
    b.best = Math.max(b.best, s.score)
    buckets.set(s.test_id, b)
  }
  return Array.from(buckets.entries()).map(([test_id, b]) => ({
    test_id,
    attempts: b.n,
    avg_score: Math.round((b.sum / b.n) * 10) / 10,
    best_score: Math.round(b.best * 10) / 10,
  }))
}

/** Longitudinal series — score per attempt, ordered chronologically. */
export interface ProgressionPoint {
  date: string
  score: number
  test_id: string
}

export async function getMyProgression(
  testId?: string,
): Promise<ProgressionPoint[]> {
  const sb = await getSupabaseServer()
  let q = sb
    .from('test_sessions')
    .select('test_id, started_at, score')
    .not('score', 'is', null)
    .order('started_at', { ascending: true })
  if (testId) q = q.eq('test_id', testId)

  const { data, error } = await q
  if (error) {
    console.error('[analytics] getMyProgression failed:', error.message)
    return []
  }
  return (data ?? []).map((r: { started_at: string; score: number | null; test_id: string }) => ({
    date: r.started_at.slice(0, 10),
    score: Number(r.score ?? 0),
    test_id: r.test_id,
  }))
}

/** Teacher: aggregates across the teacher's roster. RLS handles scoping. */
export interface CohortRow {
  user_id: string
  full_name: string | null
  email: string
  attempts: number
  avg_score: number
  last_attempt: string | null
}

export async function getCohortSummary(): Promise<CohortRow[]> {
  const sb = await getSupabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()

  // Pull roster — teachers: only rows assigned to this account (defense in depth)
  let rosterQuery = sb.from('my_students').select('user_id, full_name, email')
  if (profile?.role === 'teacher') {
    rosterQuery = rosterQuery.eq('teacher_id', user.id)
  }

  const { data: students, error: rosterErr } = await rosterQuery
  if (rosterErr || !students) {
    console.error('[analytics] roster failed:', rosterErr?.message)
    return []
  }
  if (students.length === 0) return []

  // Pull all completed sessions for those students in one query
  const { data: sessions } = await sb
    .from('test_sessions')
    .select('user_id, score, started_at')
    .in(
      'user_id',
      students.map((s: { user_id: string }) => s.user_id),
    )
    .not('score', 'is', null)

  type SessionAgg = { user_id: string; score: number | null; started_at: string }
  const byUser = new Map<string, { sum: number; n: number; last: string }>()
  for (const s of (sessions ?? []) as SessionAgg[]) {
    const b = byUser.get(s.user_id) ?? { sum: 0, n: 0, last: s.started_at }
    b.sum += Number(s.score ?? 0)
    b.n += 1
    if (s.started_at > b.last) b.last = s.started_at
    byUser.set(s.user_id, b)
  }

  return students.map((s: { user_id: string; full_name: string | null; email: string }) => {
    const b = byUser.get(s.user_id)
    return {
      user_id: s.user_id,
      full_name: s.full_name,
      email: s.email,
      attempts: b?.n ?? 0,
      avg_score: b ? Math.round((b.sum / b.n) * 10) / 10 : 0,
      last_attempt: b?.last ?? null,
    }
  })
}
