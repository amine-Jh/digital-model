/**
 * Generic results / test-session service.
 *
 * Replaces the per-test localStorage `saveXResult()` helpers. Every quiz now
 * writes a row in test_sessions + N rows in trial_results. RLS guarantees
 * each user only sees their own sessions; teachers/admins read via separate
 * helpers (listSessionsForStudent / listSessionsByTest).
 *
 * Usage from a quiz component:
 *
 *   const { data: sessionId } = await startSession({ testId: 'test-…' })
 *   …
 *   await finishSession(sessionId, {
 *     trials: trials.map((t, i) => ({
 *       question_index: i,
 *       question_id: t.questionId,
 *       selected: t.selectedList ?? [],
 *       correct: t.correct,
 *       score: t.score ?? (t.correct ? 1 : 0),
 *       reaction_time_ms: t.reactionTimeMs,
 *       free_text: t.freeText ?? null,
 *     })),
 *     totalMs: Date.now() - startedAt,
 *     score: finalPercent,
 *     correctCount,
 *     totalQuestions,
 *   })
 */

import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Trial = Database['public']['Tables']['trial_results']['Insert']
type SessionRow = Database['public']['Tables']['test_sessions']['Row']

export type MyStudentViewRow = Database['public']['Views']['my_students']['Row']

export interface StartSessionInput {
  testId: string
  metadata?: Record<string, unknown>
}

export interface FinishSessionInput {
  trials: Omit<Trial, 'session_id'>[]
  totalMs: number
  score: number
  correctCount: number
  totalQuestions: number
  metadata?: Record<string, unknown>
}

/**
 * Create a new test_sessions row in 'in-progress' status.
 * Returns the new session id.
 */
export async function startSession(
  input: StartSessionInput,
): Promise<{ data: string | null; error: string | null }> {
  const sb = getSupabaseBrowser()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await sb
    .from('test_sessions')
    .insert({
      user_id: user.id,
      test_id: input.testId,
      status: 'in-progress',
      metadata: (input.metadata ?? {}) as Database['public']['Tables']['test_sessions']['Insert']['metadata'],
    })
    .select('id')
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Insert failed' }
  return { data: data.id, error: null }
}

/**
 * Mark a session 'completed', save its score, and bulk-insert the trials.
 * Idempotent: re-calling it just overwrites the score fields.
 */
export async function finishSession(
  sessionId: string,
  input: FinishSessionInput,
): Promise<{ ok: boolean; error: string | null }> {
  const sb = getSupabaseBrowser()

  const { error: updateError } = await sb
    .from('test_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_ms: input.totalMs,
      score: input.score,
      correct_count: input.correctCount,
      total_questions: input.totalQuestions,
      metadata: (input.metadata ?? {}) as Database['public']['Tables']['test_sessions']['Update']['metadata'],
    })
    .eq('id', sessionId)
  if (updateError) return { ok: false, error: updateError.message }

  if (input.trials.length > 0) {
    const rows: Trial[] = input.trials.map((t) => ({ ...t, session_id: sessionId }))
    const { error: insertError } = await sb.from('trial_results').insert(rows)
    if (insertError) {
      console.error('[finishSession] trial_results', insertError.message)
      return { ok: false, error: insertError.message }
    }
  }

  return { ok: true, error: null }
}

/** All sessions for the current user, newest first. */
export async function listMySessions(opts?: {
  testId?: string
  limit?: number
}): Promise<{ data: SessionRow[]; error: string | null }> {
  const sb = getSupabaseBrowser()
  await sb.auth.getUser()
  let q = sb
    .from('test_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(opts?.limit ?? 50)
  if (opts?.testId) q = q.eq('test_id', opts.testId)

  const { data, error } = await q
  return { data: data ?? [], error: error?.message ?? null }
}

/** Used by teacher dashboards. RLS already constrains visibility. */
export async function listSessionsForStudent(
  studentId: string,
): Promise<{ data: SessionRow[]; error: string | null }> {
  const sb = getSupabaseBrowser()
  await sb.auth.getUser()
  const { data, error } = await sb
    .from('test_sessions')
    .select('*')
    .eq('user_id', studentId)
    .order('started_at', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}

/**
 * Sessions for a fixed set of student user ids (e.g. teacher roster).
 * Prefer this over `listMySessions()` in teacher UIs so cohort stats never include
 * the teacher’s own attempts or unrelated users if policies/views misbehave.
 */
export async function listSessionsForStudentIds(
  studentUserIds: string[],
  opts?: { testId?: string; limit?: number },
): Promise<{ data: SessionRow[]; error: string | null }> {
  const sb = getSupabaseBrowser()
  await sb.auth.getUser()
  if (studentUserIds.length === 0) {
    return { data: [], error: null }
  }
  let q = sb
    .from('test_sessions')
    .select('*')
    .in('user_id', studentUserIds)
    .order('started_at', { ascending: false })
    .limit(opts?.limit ?? 2000)
  if (opts?.testId) q = q.eq('test_id', opts.testId)
  const { data, error } = await q
  return { data: data ?? [], error: error?.message ?? null }
}

/**
 * Roster from `my_students`. For role `teacher`, rows are restricted to
 * `teacher_id = auth user` (defense in depth on top of RLS).
 */
export async function listMyStudentsView(): Promise<{
  data: MyStudentViewRow[]
  error: string | null
}> {
  const sb = getSupabaseBrowser()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()

  let q = sb.from('my_students').select('*')
  if (profile?.role === 'teacher') {
    q = q.eq('teacher_id', user.id)
  }

  const { data, error } = await q.order('email', { ascending: true })
  return { data: (data ?? []) as MyStudentViewRow[], error: error?.message ?? null }
}
