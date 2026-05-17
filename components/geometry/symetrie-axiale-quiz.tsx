'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart3 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  SYMETRIE_AXIALE_QUESTIONS,
  SYMETRIE_AXIALE_TEST_ID,
  SymetrieAxialeResult,
  SymetrieAxialeTrialResult,
  saveSymetrieAxialeResult,
} from '@/lib/geometry/symetrie-axiale'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { scoreGeometryQuestion } from '@/lib/geometry/scoring'
import { CapacityLegend } from '@/components/geometry/capacity-legend'
import { CapacityBreakdownCard } from '@/components/geometry/capacity-breakdown-card'
import { GeometryAnalyticsSummary } from '@/components/geometry/geometry-analytics-summary'
import { buildGeometrySessionMetadataPoints } from '@/lib/geometry/capacity-results'
import { buildGeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'
import { isExcludedFromGeometryScoreAndAverage } from '@/lib/geometry/geometry-scoring-exclusions'
import { toggleSelectionWithExclusive } from '@/lib/quiz-helpers'

type Phase = 'intro' | 'instructions' | 'running' | 'done'

function isAxialeScorableIndex(i: number): boolean {
  const q = SYMETRIE_AXIALE_QUESTIONS[i]
  if (!q) return false
  return !isExcludedFromGeometryScoreAndAverage(q) && (q.points ?? 0) > 0
}

export function SymetrieAxialeQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<SymetrieAxialeTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)

  const currentQuestion = SYMETRIE_AXIALE_QUESTIONS[current]
  const isMulti =
    Array.isArray(currentQuestion?.correctAnswer) &&
    (currentQuestion.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(currentQuestion?.options ?? [], prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    if (selectedList.length === 0) return

    const question = SYMETRIE_AXIALE_QUESTIONS[current]
    const excluded = isExcludedFromGeometryScoreAndAverage(question)
    const score = excluded
      ? 0
      : scoreGeometryQuestion({
          options: question.options,
          selected: selectedList,
          correctAnswer: question.correctAnswer,
        })
    const pts = question.points ?? 0
    const pointsEarned = excluded || pts === 0 ? 0 : score * pts

    const trial: SymetrieAxialeTrialResult = {
      index: current,
      questionId: question.id,
      selected: [...selectedList],
      correct: !excluded && score === 1,
      score,
      pointsEarned,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])

    if (current + 1 >= SYMETRIE_AXIALE_QUESTIONS.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setTimeout(() => {
        trialStart.current = Date.now()
      }, 100)
    }
  }, [current, selectedList])

  useEffect(() => {
    if (phase === 'done' && trials.length > 0) {
      let scoreC1 = 0
      let maxC1 = 0
      let scoreC2 = 0
      let maxC2 = 0
      let earned = 0
      let maxPts = 0
      const scorableCount = SYMETRIE_AXIALE_QUESTIONS.filter((_, i) =>
        isAxialeScorableIndex(i),
      ).length
      for (const t of trials) {
        const q = SYMETRIE_AXIALE_QUESTIONS[t.index]
        if (!isAxialeScorableIndex(t.index)) continue
        const pe = t.pointsEarned ?? 0
        const cap = q.points ?? 0
        earned += pe
        maxPts += cap
        if (q.competencies.includes('C1')) {
          maxC1 += cap
          scoreC1 += pe
        }
        if (q.competencies.includes('C2')) {
          maxC2 += cap
          scoreC2 += pe
        }
      }
      const totalPct = maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0
      const correct = trials.filter(
        (t) => isAxialeScorableIndex(t.index) && t.correct,
      ).length
      const r: SymetrieAxialeResult = {
        id: `sa-${Date.now()}`,
        userName: user?.username,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        trials,
        totalMs: Date.now() - startedAt,
        correctCount: correct,
        score: totalPct,
        scorePoints: earned,
        maxScorePoints: maxPts,
      }
      saveSymetrieAxialeResult(r)
      const geoPayload = buildGeometrySessionMetadataPoints({
        lessonTestId: SYMETRIE_AXIALE_TEST_ID,
        perQuestion: trials.map((t) => {
          const q = SYMETRIE_AXIALE_QUESTIONS[t.index]
          return {
            questionId: t.questionId,
            capacityCodes: [...(q.competencies ?? [])],
            part: q.part ?? null,
            score: t.pointsEarned ?? 0,
            correct: t.correct,
          }
        }),
        capacityBreakdown: {
          C1: {
            earned: scoreC1,
            max: maxC1,
            percent: maxC1 > 0 ? Math.round((scoreC1 / maxC1) * 100) : 0,
          },
          C2: {
            earned: scoreC2,
            max: maxC2,
            percent: maxC2 > 0 ? Math.round((scoreC2 / maxC2) * 100) : 0,
          },
        },
        totalPercent: totalPct,
      })
      const geometryAnalytics = buildGeometryAnalyticsReport({
        testId: SYMETRIE_AXIALE_TEST_ID,
        questions: SYMETRIE_AXIALE_QUESTIONS,
        trials: trials.map((t) => ({
          index: t.index,
          questionId: t.questionId,
          correct: t.correct,
          pointsEarned: t.pointsEarned ?? 0,
        })),
        isScorableIndex: isAxialeScorableIndex,
        scoringMode: 'points',
      })
      persistCompletedTestSessionBestEffort({
        testId: SYMETRIE_AXIALE_TEST_ID,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalMs: r.totalMs,
        score: r.score,
        correctCount: r.correctCount,
        totalQuestions: scorableCount,
        trials: r.trials.map((t) => ({
          question_index: t.index,
          question_id: t.questionId,
          selected: t.selected,
          correct: t.correct,
          score: t.pointsEarned != null ? Math.min(1, t.pointsEarned / 2) : t.score ?? 0,
          reaction_time_ms: t.reactionTimeMs,
        })),
        metadata: {
          source: 'symetrie-axiale-quiz',
          ...geoPayload,
          geometryAnalytics,
        },
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
        }}
        onBack={() => setPhase('intro')}
      />
    )
  }

  if (phase === 'done') {
    return <Results trials={trials} onExit={() => router.push('/dashboard')} />
  }

  return (
    <TrialView
      index={current}
      total={SYMETRIE_AXIALE_QUESTIONS.length}
      question={currentQuestion}
      selectedList={selectedList}
      isMulti={isMulti}
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
          <BarChart3 className="h-4 w-4" /> Symétrie axiale
        </div>
        <h1 className="mb-3 text-3xl font-bold">Symétrie axiale</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId={SYMETRIE_AXIALE_TEST_ID} />
        </div>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Barème :</strong> Q2–Q15 → 1 pt chacune (C1 /14) · Q16–Q18 → 2 pts
          chacune (C2 /6) · <strong>Total /20</strong>. Les auto-évaluations ne comptent pas
          dans le score.
        </div>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Durée estimée :</strong> ~15 minutes. Répondez avec soin à chaque question.
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
            <strong>1.</strong> Lisez attentivement chaque question. Certaines incluent des illustrations pour vous aider.
          </li>
          <li>
            <strong>2.</strong> Sélectionnez la réponse que vous jugez correcte parmi les quatre options (A, B, C, ou D).
          </li>
          <li>
            <strong>3.</strong> Cliquez « Valider » pour passer à la question suivante.
          </li>
          <li>
            <strong>4.</strong> Barème : questions Q2–Q15 → 1 point chacune (C1) ; Q16–Q18 → 2 points
            chacune (C2). Total sur 20. Les auto-évaluations ne comptent pas.
          </li>
          <li>
            <strong>5.</strong> À la fin : score sur 20, synthèse par parties et par compétences.
          </li>
        </ol>
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          💡 Les questions couvrent des concepts de symétrie axiale. Prenez le temps de bien comprendre chaque question avant de répondre.
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
  question: {
    id: string
    competencies: string[]
    question: string
    options: string[]
    requiresImage: boolean
    imagePath?: string
    part: string
    correctAnswer: number | number[] | null
    correction?: string
    points?: number
  }
  selectedList: number[]
  isMulti: boolean
  onToggle: (index: number) => void
  onSubmit: () => void
}

function renderInlineLatex(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (match, latex) => {
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
  onToggle,
  onSubmit,
}: TrialViewProps) {
  const hasMainImage = question.imagePath && question.requiresImage

  return (
    <main className="container mx-auto max-w-4xl py-8">
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
          {typeof question.points === 'number' && question.points > 0 && (
            <p className="text-xs text-muted-foreground">
              Barème : {question.points} pt{question.points > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mb-6" />

      <Card className="p-6">
        <div className={hasMainImage ? 'grid grid-cols-2 gap-6 items-start' : ''}>
          {/* Main image if needed (Q9-Q15) */}
          {hasMainImage && (
            <div className="flex items-center justify-center rounded-lg border border-gray-300 overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={question.imagePath}
                alt={`Question ${question.id}`}
                className="w-full h-auto object-cover max-h-96"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `<div class="flex items-center justify-center p-8"><p class="text-sm text-gray-500">Image non disponible</p></div>`
                  }
                }}
              />
            </div>
          )}

          {/* Question and answers column */}
          <div className={hasMainImage ? '' : 'space-y-6'}>
            {/* Question text with LaTeX (rendered at build) */}
            <div
              className="text-base leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderInlineLatex(question.question),
              }}
            />

            {(question.part === 'preQuestion' ||
              question.part === 'autoeval2' ||
              question.part === 'autoeval3') && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
                Auto-évaluation — non comptée dans le score (/20).
              </div>
            )}

            {isMulti && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
                ℹ️ Plusieurs réponses correctes possibles — cochez toutes les bonnes réponses.
              </div>
            )}

            {/* Answer options */}
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const answerLabel = String.fromCharCode(65 + idx) // A, B, C, D
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

            {/* Submit button */}
            <Button
              onClick={onSubmit}
              disabled={selectedList.length === 0}
              className="w-full"
              size="lg"
            >
              Valider <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </main>
  )
}

interface ResultsProps {
  trials: SymetrieAxialeTrialResult[]
  onExit: () => void
}

function Results({ trials, onExit }: ResultsProps) {
  let earned = 0
  let maxPts = 0
  let scoreC1 = 0
  let maxC1 = 0
  let scoreC2 = 0
  let maxC2 = 0
  for (const t of trials) {
    const q = SYMETRIE_AXIALE_QUESTIONS[t.index]
    if (!isAxialeScorableIndex(t.index)) continue
    const pe = t.pointsEarned ?? 0
    const cap = q.points ?? 0
    earned += pe
    maxPts += cap
    if (q.competencies.includes('C1')) {
      scoreC1 += pe
      maxC1 += cap
    }
    if (q.competencies.includes('C2')) {
      scoreC2 += pe
      maxC2 += cap
    }
  }
  const pct = maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0
  const correct = trials.filter((t) => isAxialeScorableIndex(t.index) && t.correct).length
  const scorableN = SYMETRIE_AXIALE_QUESTIONS.filter((_, i) => isAxialeScorableIndex(i)).length

  const breakdown = {
    C1: {
      earned: scoreC1,
      max: maxC1,
      percent: maxC1 > 0 ? Math.round((scoreC1 / maxC1) * 100) : 0,
    },
    C2: {
      earned: scoreC2,
      max: maxC2,
      percent: maxC2 > 0 ? Math.round((scoreC2 / maxC2) * 100) : 0,
    },
  }

  const geometryAnalytics = buildGeometryAnalyticsReport({
    testId: SYMETRIE_AXIALE_TEST_ID,
    questions: SYMETRIE_AXIALE_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      correct: t.correct,
      pointsEarned: t.pointsEarned ?? 0,
    })),
    isScorableIndex: isAxialeScorableIndex,
    scoringMode: 'points',
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
              {earned} / {maxPts}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Pourcentage</p>
            <p className="text-2xl font-bold">{pct}%</p>
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Réponses entièrement correctes : {correct} / {scorableN}
        </p>
        <GeometryAnalyticsSummary report={geometryAnalytics} />
        <CapacityBreakdownCard
          testId={SYMETRIE_AXIALE_TEST_ID}
          breakdown={breakdown}
          unit="points"
        />
        <div className="mb-6 max-h-64 overflow-auto rounded-md border bg-slate-50 p-3 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Détails :</p>
          {trials.map((t) => {
            const question = SYMETRIE_AXIALE_QUESTIONS[t.index]
            const isAutoEval = !isAxialeScorableIndex(t.index)
            return (
              <div key={t.index} className="text-left text-xs border-b border-slate-200 dark:border-slate-700 py-2 last:border-b-0">
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
