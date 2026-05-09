'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart3 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  VECTORS_QUESTIONS,
  VECTORS_TEST_ID,
  VectorsResult,
  VectorsTrialResult,
  saveVectorsResult,
} from '@/lib/geometry/geo-vectors-complete'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import type { Json } from '@/lib/types/database'
import { toggleSelectionWithExclusive } from '@/lib/quiz-helpers'
import { ClickableVectorsPlane } from '@/components/geometry/clickable-vectors-plane'
import { scoreGeometryQuestion, computeFinalPercent } from '@/lib/geometry/scoring'
import { CapacityLegend } from '@/components/geometry/capacity-legend'
import { CapacityBreakdownCard } from '@/components/geometry/capacity-breakdown-card'
import { GeometryAnalyticsSummary } from '@/components/geometry/geometry-analytics-summary'
import { buildGeometrySessionMetadataFraction } from '@/lib/geometry/capacity-results'
import { buildGeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'
import { isExcludedFromGeometryScoreAndAverage } from '@/lib/geometry/geometry-scoring-exclusions'

type Phase = 'intro' | 'instructions' | 'running' | 'done'

function isVectorsScorableIndex(i: number): boolean {
  const q = VECTORS_QUESTIONS[i]
  if (!q) return false
  if (q.correctAnswer === null) return false
  return !isExcludedFromGeometryScoreAndAverage({
    ...q,
    question: q.question,
  })
}

function arrayEquals(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const as = [...a].sort()
  const bs = [...b].sort()
  return as.every((v, i) => v === bs[i])
}

export function VectorsQuizTest() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<VectorsTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [freeText, setFreeText] = useState('')
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)

  const maxIndex = Math.max(0, VECTORS_QUESTIONS.length - 1)
  const safeCurrent = Math.min(Math.max(0, current), maxIndex)
  const question = VECTORS_QUESTIONS[safeCurrent]
  const isMulti =
    Array.isArray(question?.correctAnswer) &&
    (question.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(question.options, prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    const maxIx = Math.max(0, VECTORS_QUESTIONS.length - 1)
    const idx = Math.min(Math.max(0, current), maxIx)
    const q = VECTORS_QUESTIONS[idx]
    if (!q) return

    const isFree = Boolean(q.pointPlacement || q.fillIn)

    if (!isFree && selectedList.length === 0) return

    const score = isFree
      ? 0
      : scoreGeometryQuestion({
          options: q.options,
          selected: selectedList,
          correctAnswer: q.correctAnswer,
        })

    const trial: VectorsTrialResult = {
      index: idx,
      questionId: q.id,
      selected: selectedList[0] ?? -1,
      selectedList: [...selectedList],
      freeText: isFree ? freeText : undefined,
      correct: score === 1,
      score,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])
    setFreeText('')

    if (idx + 1 >= VECTORS_QUESTIONS.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setTimeout(() => {
        trialStart.current = Date.now()
      }, 100)
    }
  }, [current, selectedList, freeText])

  useEffect(() => {
    if (phase !== 'running') return
    const hi = Math.max(0, VECTORS_QUESTIONS.length - 1)
    if (current > hi) setCurrent(hi)
  }, [phase, current])

  useEffect(() => {
    if (phase === 'done' && trials.length > 0) {
      const scorable = trials.filter((t) => isVectorsScorableIndex(t.index))
      const correct = scorable.filter((t) => t.correct).length
      const r: VectorsResult = {
        id: `vec-${Date.now()}`,
        userName: user?.username,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        trials,
        totalMs: Date.now() - startedAt,
        correctCount: correct,
        score: computeFinalPercent(scorable.map((t) => t.score ?? 0)),
      }
      saveVectorsResult(r)
      const trialsPayload = r.trials.map((t) => ({
        question_index: t.index,
        question_id: t.questionId,
        selected: (t.selectedList?.length ? t.selectedList : [t.selected]) as Json,
        free_text: t.freeText ?? null,
        correct: t.correct,
        score: t.score ?? (t.correct ? 1 : 0),
        reaction_time_ms: t.reactionTimeMs,
      }))
      persistCompletedTestSessionBestEffort({
        testId: VECTORS_TEST_ID,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalMs: r.totalMs,
        score: r.score,
        correctCount: r.correctCount,
        totalQuestions: VECTORS_QUESTIONS.length,
        trials: trialsPayload,
        metadata: (() => {
          const geoPayload = buildGeometrySessionMetadataFraction({
            lessonTestId: VECTORS_TEST_ID,
            questions: VECTORS_QUESTIONS,
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: isVectorsScorableIndex,
          })
          const geometryAnalytics = buildGeometryAnalyticsReport({
            testId: VECTORS_TEST_ID,
            questions: VECTORS_QUESTIONS,
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: isVectorsScorableIndex,
            scoringMode: 'fraction',
          })
          return {
            source: 'vectors-quiz',
            ...geoPayload,
            geometryAnalytics,
          }
        })(),
      })
    }
  }, [phase, trials, startedAt, user])

  if (phase === 'intro') {
    return (
      <Intro
        onQuit={() => router.push('/dashboard')}
        onStart={() => {
          setStartedAt(Date.now())
          trialStart.current = Date.now()
          setPhase('instructions')
        }}
      />
    )
  }

  if (phase === 'instructions') {
    return (
      <Instructions
        onBegin={() => {
          setPhase('running')
          setCurrent(0)
          trialStart.current = Date.now()
        }}
        onBack={() => setPhase('intro')}
      />
    )
  }

  if (phase === 'done') {
    return <Results trials={trials} onExit={() => router.push('/dashboard')} />
  }

  if (!question) {
    return (
      <main className="container mx-auto max-w-2xl py-16 text-center text-sm text-muted-foreground">
        <p>Chargement du questionnaire…</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Retour au tableau de bord
        </Button>
      </main>
    )
  }

  return (
    <TrialView
      index={safeCurrent}
      total={VECTORS_QUESTIONS.length}
      question={question}
      selectedList={selectedList}
      isMulti={isMulti}
      freeText={freeText}
      onChangeFreeText={setFreeText}
      onToggle={toggleSelect}
      onSubmit={submit}
    />
  )
}

function Intro({ onStart, onQuit }: { onStart: () => void; onQuit: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button variant="ghost" size="sm" onClick={onQuit} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
      </Button>
      <Card className="p-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600">
          <BarChart3 className="h-4 w-4" /> Vecteurs &amp; Translation
        </div>
        <h1 className="mb-3 text-3xl font-bold">Vecteurs &amp; Translation</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId="test-geo-vectors-complete" />
        </div>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Durée estimée :</strong> ~10 minutes. Certaines questions admettent plusieurs
          réponses correctes.
        </div>
        <Button onClick={onStart}>
          Commencer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

function Instructions({ onBegin, onBack }: { onBegin: () => void; onBack: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <Card className="p-8">
        <h2 className="mb-3 text-2xl font-bold">Consignes</h2>
        <ol className="mb-6 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>1.</strong> Commencez par l&apos;auto-évaluation sur votre rappel de la leçon.
          </li>
          <li>
            <strong>2.</strong> Lisez chaque question attentivement — les notations vectorielles
            sont affichées en LaTeX.
          </li>
          <li>
            <strong>3.</strong> Pour les questions à choix multiples, sélectionnez{' '}
            <em>toutes</em> les réponses correctes avant de valider.
          </li>
          <li>
            <strong>4.</strong> Cliquez « Valider » pour passer à la question suivante.
          </li>
          <li>
            <strong>5.</strong> Une réponse est correcte uniquement si toutes les bonnes options
            sont cochées (et aucune mauvaise).
          </li>
        </ol>
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          💡 Prenez le temps de bien analyser chaque notation vectorielle avant de répondre.
        </div>
        <Button onClick={onBegin}>
          Commencer les questions <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

interface TrialViewProps {
  index: number
  total: number
  question: (typeof VECTORS_QUESTIONS)[number]
  selectedList: number[]
  isMulti: boolean
  freeText: string
  onChangeFreeText: (v: string) => void
  onToggle: (idx: number) => void
  onSubmit: () => void
}

function renderInlineLatex(text: string): string {
  return text.replace(/\\\(([^]+?)\\\)/g, (match, latex) => {
    try {
      return `<span class="inline-math">${KaTeX.renderToString(latex, {
        throwOnError: false,
      })}</span>`
    } catch {
      return match
    }
  })
}

function TrialView({
  index,
  total,
  question,
  selectedList,
  isMulti,
  freeText,
  onChangeFreeText,
  onToggle,
  onSubmit,
}: TrialViewProps) {
  const showPlane = question.showCoordPlane === true
  const hasImage = Boolean(question.imagePath)
  const isFillIn = Boolean(question.fillIn)
  const isPointPlacement = Boolean(question.pointPlacement)
  const isFreeForm = isFillIn || isPointPlacement
  const splitLayout = hasImage || showPlane || isPointPlacement

  const figurePanel = (
    <div className="space-y-3">
      {isPointPlacement && question.pointPlacement && (
        <ClickableVectorsPlane
          labels={question.pointPlacement.labels}
          onChange={(pts) =>
            onChangeFreeText(
              pts.map((p) => `${p.name}(${p.x};${p.y})`).join(' · '),
            )
          }
        />
      )}
      {!isPointPlacement && showPlane && (
        // Visual reference plane (read-only) — used by questions like Q12
        // that don't ask the student to place points, just to read the
        // configuration in the same coordinate system as Q9-Q11.
        <ClickableVectorsPlane labels={[]} />
      )}
      {hasImage && !isPointPlacement && !showPlane && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imagePath}
          alt={`Figure ${question.id}`}
          className="mx-auto block max-h-[420px] w-full rounded border bg-white object-contain"
        />
      )}
    </div>
  )

  const questionPanel = (
    <div className="space-y-6">
      <div
        className="text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderInlineLatex(question.question) }}
      />

      {isMulti && !isFreeForm && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
          ℹ️ Plusieurs réponses correctes possibles — cochez toutes les bonnes réponses.
        </div>
      )}

      {isFillIn && question.fillIn && (
        <FillInFields fields={question.fillIn.fields} value={freeText} onChange={onChangeFreeText} />
      )}

      {isPointPlacement && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          ✍️ Placez le(s) point(s) en cliquant sur le repère à gauche.
        </div>
      )}

      {!isFreeForm && (
        <div className="space-y-2">
          {question.options.map((option, idx) => {
            const answerLabel = String.fromCharCode(65 + idx)
            const isSelected = selectedList.includes(idx)
            return (
              <button
                key={idx}
                onClick={() => onToggle(idx)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center ${
                      isMulti ? 'rounded' : 'rounded-full'
                    } border-2 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div
                      className="font-semibold text-gray-900 dark:text-white"
                      dangerouslySetInnerHTML={{
                        __html: renderInlineLatex(`${answerLabel}. ${option}`),
                      }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={!isFreeForm && selectedList.length === 0}
        className="w-full"
        size="lg"
      >
        Valider <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <main
      className={`container mx-auto py-8 ${splitLayout ? 'max-w-7xl' : 'max-w-4xl'}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Question {index + 1} / {total}
        </h2>
        <div className="text-right">
          <span className="text-sm font-semibold text-blue-600">{question.id}</span>
          {question.competencies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Compétence: {question.competencies.join(', ')}
            </p>
          )}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mb-6" />

      {splitLayout ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-4">{figurePanel}</Card>
          <Card className="p-6">{questionPanel}</Card>
        </div>
      ) : (
        <Card className="p-6">{questionPanel}</Card>
      )}
    </main>
  )
}

// Inline numeric coefficient inputs (Q18). Stores all values back to a single
// `freeText` string for persistence — format: "v1 ; v2 ; v3".
function FillInFields({
  fields,
  value,
  onChange,
}: {
  fields: { label: string; expected?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const parts = useMemo(() => {
    const raw = value ? value.split(' ; ') : []
    const pad = Math.max(0, fields.length - raw.length)
    return [...raw, ...Array(pad).fill('')]
  }, [value, fields])

  const set = (i: number, v: string) => {
    const next = [...parts]
    next[i] = v
    onChange(next.join(' ; '))
  }

  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-3">
          <input
            type="text"
            value={parts[i] ?? ''}
            onChange={(e) => set(i, e.target.value)}
            placeholder="?"
            className="w-28 rounded border border-gray-300 bg-white px-3 py-2 text-center font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <span
            className="text-sm"
            dangerouslySetInnerHTML={{ __html: renderInlineLatex(f.label) }}
          />
        </div>
      ))}
    </div>
  )
}

// (Static plane was removed — Q9/Q10/Q11 now use ClickableVectorsPlane and
//  Q8/Q12-Q18 use the static figure /images/geometry/vectors/vecteurs.png.)

interface ResultsProps {
  trials: VectorsTrialResult[]
  onExit: () => void
}

function Results({ trials, onExit }: ResultsProps) {
  const scorable = trials.filter((t) => isVectorsScorableIndex(t.index))
  const correct = scorable.filter((t) => t.correct).length
  const pct =
    scorable.length > 0
      ? computeFinalPercent(scorable.map((t) => t.score ?? (t.correct ? 1 : 0)))
      : 0

  const geo = buildGeometrySessionMetadataFraction({
    lessonTestId: VECTORS_TEST_ID,
    questions: VECTORS_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: isVectorsScorableIndex,
  })

  const geometryAnalytics = buildGeometryAnalyticsReport({
    testId: VECTORS_TEST_ID,
    questions: VECTORS_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: isVectorsScorableIndex,
    scoringMode: 'fraction',
  })

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-6 text-2xl font-bold">Test terminé</h1>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-2xl font-bold">
              {correct} / {scorable.length}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Pourcentage</p>
            <p className="text-2xl font-bold">{pct}%</p>
          </div>
        </div>
        <GeometryAnalyticsSummary report={geometryAnalytics} />
        <CapacityBreakdownCard
          testId={VECTORS_TEST_ID}
          breakdown={geo.capacityBreakdown}
          unit="fraction"
        />
        <div className="mb-6 max-h-64 overflow-auto rounded-md border bg-slate-50 p-3 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Détails :</p>
          {trials.map((t) => {
            const q = VECTORS_QUESTIONS[t.index]
            const isAutoEval = q.correctAnswer === null
            return (
              <div
                key={t.index}
                className="text-left text-xs border-b border-slate-200 dark:border-slate-700 py-2 last:border-b-0"
              >
                {isAutoEval ? (
                  <span className="text-slate-600 dark:text-slate-400">
                    {t.questionId}: Auto-évaluation
                  </span>
                ) : (
                  <span className={t.correct ? 'text-green-600' : 'text-red-600'}>
                    {t.questionId}: {t.correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <Button onClick={onExit}>Retour au tableau de bord</Button>
      </Card>
    </main>
  )
}
