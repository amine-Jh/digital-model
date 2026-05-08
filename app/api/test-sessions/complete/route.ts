/**
 * POST — insert a completed `test_sessions` row and optional `trial_results`
 * for dedicated assessments (same tables as /api/submissions + finishSession).
 */
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import {
  ensureTestSessionFkPrereqs,
  normalizeTrialQuestionIndices,
} from '@/lib/supabase/ensure-test-session-fk'
import type { Json } from '@/lib/types/database'

type TrialBody = {
  question_index: number
  question_id: string
  selected?: Json
  free_text?: string | null
  correct?: boolean
  score?: number
  reaction_time_ms?: number | null
}

function asTrialRows(
  sessionId: string,
  trials: TrialBody[],
): {
  session_id: string
  question_index: number
  question_id: string
  selected: Json
  free_text: string | null
  correct: boolean
  score: number
  reaction_time_ms: number | null
}[] {
  return trials.map((t, i) => {
    const sel = t.selected
    const selected: Json = Array.isArray(sel) ? sel : sel != null ? [sel as Json] : []
    const score = typeof t.score === 'number' && Number.isFinite(t.score) ? Math.max(0, Math.min(1, t.score)) : 0
    return {
      session_id: sessionId,
      question_index: typeof t.question_index === 'number' ? t.question_index : i,
      question_id: String(t.question_id ?? `q-${i}`),
      selected,
      free_text: t.free_text ?? null,
      correct: Boolean(t.correct),
      score,
      reaction_time_ms:
        typeof t.reaction_time_ms === 'number' && Number.isFinite(t.reaction_time_ms)
          ? Math.round(t.reaction_time_ms)
          : null,
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      testId?: string
      startedAt?: string
      completedAt?: string
      totalMs?: number | null
      score?: number
      correctCount?: number
      totalQuestions?: number
      trials?: TrialBody[]
      metadata?: Record<string, unknown>
    }

    const testId = String(body.testId ?? '')
    if (!testId) {
      return NextResponse.json({ error: 'testId required' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const startedAt =
      typeof body.startedAt === 'string' && body.startedAt.trim() !== ''
        ? body.startedAt
        : new Date().toISOString()
    const completedAt =
      typeof body.completedAt === 'string' && body.completedAt.trim() !== ''
        ? body.completedAt
        : new Date().toISOString()

    const pendingAdminValidation = Boolean(
      (body as { pendingAdminValidation?: boolean }).pendingAdminValidation,
    )

    const scoreRaw =
      typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : 0
    const score = pendingAdminValidation
      ? null
      : Math.max(0, Math.min(100, Math.round(scoreRaw * 100) / 100))

    const correctCount = pendingAdminValidation
      ? null
      : typeof body.correctCount === 'number' && Number.isFinite(body.correctCount)
        ? Math.max(0, Math.round(body.correctCount))
        : 0
    const totalQuestions =
      typeof body.totalQuestions === 'number' && Number.isFinite(body.totalQuestions)
        ? Math.max(0, Math.round(body.totalQuestions))
        : 0

    const totalMs =
      body.totalMs != null && typeof body.totalMs === 'number' && Number.isFinite(body.totalMs)
        ? Math.round(body.totalMs)
        : null

    const trials = Array.isArray(body.trials) ? body.trials : []
    const fk = await ensureTestSessionFkPrereqs(sb, user, testId)
    if (!fk.ok) {
      return NextResponse.json({ error: fk.message }, { status: fk.status })
    }

    const metadata = {
      ...(typeof body.metadata === 'object' && body.metadata !== null && !Array.isArray(body.metadata)
        ? body.metadata
        : {}),
      ...(pendingAdminValidation ? { pendingAdminValidation: true as const } : {}),
    } as Record<string, unknown>

    const { data: session, error } = await sb
      .from('test_sessions')
      .insert({
        user_id: user.id,
        test_id: testId,
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        total_ms: totalMs,
        score,
        correct_count: correctCount,
        total_questions: totalQuestions,
        metadata: metadata as unknown as Json,
      })
      .select('id')
      .single()

    if (error || !session) {
      console.error('[test-sessions/complete]', error?.message, error?.code)
      const code = error?.code
      const hint =
        code === '23503'
          ? 'Foreign key violation (missing tests row or profiles row).'
          : code === '23505'
            ? 'Unique constraint violation.'
            : error?.message ?? 'Insert failed'
      const status = code === '23503' || code === '23505' ? 409 : 500
      return NextResponse.json({ error: hint, code: code ?? undefined }, { status })
    }

    if (trials.length > 0) {
      const rows = normalizeTrialQuestionIndices(asTrialRows(session.id, trials))
      const { error: trialErr } = await sb.from('trial_results').insert(rows)
      if (trialErr) {
        console.error('[test-sessions/complete] trial_results', trialErr.message, trialErr.code)
        const st = trialErr.code === '23505' || trialErr.code === '23503' ? 409 : 500
        return NextResponse.json(
          { error: `Session saved but trials failed: ${trialErr.message}`, code: trialErr.code },
          { status: st },
        )
      }
    }

    return NextResponse.json({ ok: true, sessionId: session.id })
  } catch (err) {
    console.error('[test-sessions/complete]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
