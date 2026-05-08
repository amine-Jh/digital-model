/**
 * /api/submissions
 *
 * POST — score MCQ answers against `mockTestQuestions` and persist the
 *        attempt as a row in public.test_sessions (+ trial_results).
 * GET  — list submissions for the caller (or for a given userId when
 *        called by a teacher/admin — RLS scopes the read).
 *
 * NO local submissions.json. Backed by Supabase.
 */
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import {
  ensureTestSessionFkPrereqs,
  normalizeTrialQuestionIndices,
} from '@/lib/supabase/ensure-test-session-fk'
import { mockTestQuestions, mockTests } from '@/lib/mock-data'
import type { Question } from '@/lib/mock-data'
import type { Json } from '@/lib/types/database'
import {
  GEOMETRY_COGNITION_DOMAIN,
  buildGeometryCapacityBreakdown,
  isGeometryMcqCorrect,
} from '@/lib/geometry-mcq'

interface AnswerInput {
  questionId: string
  selectedValue: string | null
  timeSpentMs?: number | null
}

function parseSelectedLabels(val: string | null): string[] {
  if (val == null || val === '') return []
  const t = val.trim()
  if (t.startsWith('[')) {
    try {
      const p = JSON.parse(t) as unknown
      return Array.isArray(p) ? p.map(String) : []
    } catch {
      return []
    }
  }
  return [val]
}

/** MCQs used for scoring: embedded questions on the test, else shared mock bank. */
function mcqCatalogForTest(testId: string): Question[] {
  const test = mockTests.find((t) => t.id === testId)
  const embedded =
    test?.questions?.filter((q) => {
      if (q.type !== 'mcq' || !q.options?.length) return false
      return (
        q.correctOptionIndex !== undefined ||
        (q.correctOptionIndices != null && q.correctOptionIndices.length > 0)
      )
    }) ?? []
  if (embedded.length > 0) return embedded
  return mockTestQuestions.filter(
    (q) =>
      q.type === 'mcq' &&
      Boolean(q.options?.length) &&
      (q.correctOptionIndex !== undefined ||
        (q.correctOptionIndices != null && q.correctOptionIndices.length > 0)),
  )
}

function scoreAnswers(
  testId: string,
  answers: AnswerInput[],
): {
  scorePercent: number | null
  correctCount: number
  total: number
  perQuestion: { questionId: string; correct: boolean; selected: string | null }[]
} {
  const mcqWithKey = mcqCatalogForTest(testId)
  const testMeta = mockTests.find((t) => t.id === testId)
  const isGeometry = testMeta?.domain === GEOMETRY_COGNITION_DOMAIN
  let correct = 0
  const perQuestion: { questionId: string; correct: boolean; selected: string | null }[] = []
  for (const q of mcqWithKey) {
    const a = answers.find((x) => x.questionId === q.id)
    const labels = parseSelectedLabels(a?.selectedValue ?? null)
    if (!q.options || labels.length === 0) {
      perQuestion.push({
        questionId: q.id,
        correct: false,
        selected: a?.selectedValue ?? null,
      })
      continue
    }
    let isCorrect = false
    if (isGeometry) {
      isCorrect = isGeometryMcqCorrect(q, labels)
    } else {
      const only = labels[0]
      const idx = only != null ? q.options.indexOf(only) : -1
      isCorrect = idx === q.correctOptionIndex
    }
    if (isCorrect) correct++
    perQuestion.push({
      questionId: q.id,
      correct: isCorrect,
      selected: a?.selectedValue ?? null,
    })
  }
  const total = mcqWithKey.length
  const scorePercent = total === 0 ? null : Math.round((correct / total) * 100)
  return { scorePercent, correctCount: correct, total, perQuestion }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const testId = String(body.testId ?? '')
    const startedAt = String(body.startedAt ?? new Date().toISOString())
    const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : []

    if (!testId) {
      return NextResponse.json({ error: 'testId required' }, { status: 400 })
    }

    const sb = await getSupabaseServer()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { scorePercent, correctCount, total, perQuestion } = scoreAnswers(testId, answers)
    const testRow = mockTests.find((t) => t.id === testId)
    const embeddedMcq =
      testRow?.questions?.filter(
        (q) => q.type === 'mcq' && q.options && q.options.length > 0,
      ) ?? []
    const capacityBreakdown =
      testRow?.domain === GEOMETRY_COGNITION_DOMAIN && embeddedMcq.length > 0
        ? buildGeometryCapacityBreakdown(testId, embeddedMcq, perQuestion)
        : undefined

    const fk = await ensureTestSessionFkPrereqs(sb, user, testId)
    if (!fk.ok) {
      return NextResponse.json({ error: fk.message }, { status: fk.status })
    }

    const { data: session, error } = await sb
      .from('test_sessions')
      .insert({
        user_id: user.id,
        test_id: testId,
        status: 'completed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        score: scorePercent,
        correct_count: correctCount,
        total_questions: total,
        metadata: {
          rawAnswers: answers,
          ...(capacityBreakdown
            ? { capacityBreakdown, breakdownUnit: 'fraction' as const }
            : {}),
        } as unknown as Json,
      })
      .select('id, score, correct_count, total_questions, started_at, completed_at')
      .single()

    if (error || !session) {
      console.error('[submissions POST]', error?.message, error?.code)
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

    if (perQuestion.length > 0) {
      const rows = normalizeTrialQuestionIndices(
        perQuestion.map((p, i) => ({
          session_id: session.id,
          question_index: i,
          question_id: p.questionId,
          selected: (() => {
            if (p.selected == null) return [] as unknown as Json
            const labels = parseSelectedLabels(p.selected)
            return (labels.length > 0 ? labels : [p.selected]) as unknown as Json
          })(),
          free_text: null,
          correct: p.correct,
          score: p.correct ? 1 : 0,
        })),
      )
      const { error: trialErr } = await sb.from('trial_results').insert(rows)
      if (trialErr) {
        console.error('[submissions POST] trial_results', trialErr.message, trialErr.code)
        const st = trialErr.code === '23505' || trialErr.code === '23503' ? 409 : 500
        return NextResponse.json(
          { error: `Session saved but trials failed: ${trialErr.message}`, code: trialErr.code },
          { status: st },
        )
      }
    }

    return NextResponse.json({
      ok: true,
      submission: {
        id: session.id,
        userId: user.id,
        testId,
        startedAt: session.started_at,
        submittedAt: session.completed_at,
        scorePercent: session.score,
      },
    })
  } catch (err) {
    console.error('[submissions POST]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userIdFilter = searchParams.get('userId')

  const sb = await getSupabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let q = sb
    .from('test_sessions')
    .select('id, user_id, test_id, score, started_at, completed_at')
    .order('started_at', { ascending: false })
  if (userIdFilter) q = q.eq('user_id', userIdFilter)

  const { data, error } = await q
  if (error) {
    console.error('[submissions GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map back to the legacy TestSubmission shape so existing callers keep working.
  type SessionRow = {
    id: string
    user_id: string
    test_id: string
    score: number | null
    started_at: string
    completed_at: string | null
  }
  const submissions = (data ?? []).map((r: SessionRow) => ({
    id: r.id,
    userId: r.user_id,
    testId: r.test_id,
    startedAt: r.started_at,
    submittedAt: r.completed_at ?? r.started_at,
    answers: [],
    scorePercent: r.score,
  }))

  return NextResponse.json({ submissions })
}
