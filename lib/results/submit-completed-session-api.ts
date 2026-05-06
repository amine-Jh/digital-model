/**
 * Client helper: persist a completed assessment as one `test_sessions` row plus
 * `trial_results` via the server (cookie session), same pattern as POST /api/submissions.
 */

import type { Json } from '@/lib/types/database'

export type CompletedSessionTrialInput = {
  question_index: number
  question_id: string
  /** Stored as JSONB (e.g. option indices, strings, booleans). */
  selected: Json
  free_text?: string | null
  correct: boolean
  /** Per-trial score in [0, 1] to match `trial_results.score`. */
  score: number
  reaction_time_ms?: number | null
}

export type SubmitCompletedSessionInput = {
  testId: string
  startedAt?: string
  completedAt?: string
  totalMs?: number | null
  /** Final percent 0–100 → `test_sessions.score` (ignored when `pendingAdminValidation`). */
  score: number
  correctCount: number
  totalQuestions: number
  trials: CompletedSessionTrialInput[]
  metadata?: Record<string, unknown>
  /** When true, session is stored with `score: null` until an administrator validates. */
  pendingAdminValidation?: boolean
}

export type SubmitCompletedSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string }

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100))
}

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000))
}

/**
 * POST `/api/test-sessions/complete` — requires an authenticated Supabase session (cookies).
 * Failures return `{ ok: false, error }` without throwing (safe to fire-and-forget).
 */
export async function submitCompletedTestSession(
  input: SubmitCompletedSessionInput,
): Promise<SubmitCompletedSessionResult> {
  const trials = input.trials.map((t) => ({
    question_index: t.question_index,
    question_id: String(t.question_id),
    selected: t.selected,
    free_text: t.free_text ?? null,
    correct: Boolean(t.correct),
    score: clampUnit(Number(t.score)),
    reaction_time_ms:
      t.reaction_time_ms == null || !Number.isFinite(t.reaction_time_ms)
        ? null
        : Math.round(t.reaction_time_ms),
  }))

  try {
    const res = await fetch('/api/test-sessions/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: input.testId,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        totalMs: input.totalMs,
        score: input.pendingAdminValidation ? null : clampPercent(input.score),
        correctCount: input.pendingAdminValidation ? null : Math.max(0, Math.round(input.correctCount)),
        totalQuestions: Math.max(0, Math.round(input.totalQuestions)),
        trials,
        metadata: input.metadata ?? {},
        pendingAdminValidation: input.pendingAdminValidation === true,
      }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      sessionId?: string
      error?: string
    }
    if (!res.ok) {
      return { ok: false, error: typeof body.error === 'string' ? body.error : 'Request failed' }
    }
    if (typeof body.sessionId !== 'string') {
      return { ok: false, error: 'Invalid response' }
    }
    return { ok: true, sessionId: body.sessionId }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

/** Fire-and-forget; logs a console warning on failure (does not toast). */
export function persistCompletedTestSessionBestEffort(input: SubmitCompletedSessionInput): void {
  void submitCompletedTestSession(input).then((r) => {
    if (!r.ok) {
      console.warn('[persistCompletedTestSession]', input.testId, r.error)
    }
  })
}
