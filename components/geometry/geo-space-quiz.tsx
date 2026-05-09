'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart3, Box } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  GEO_SPACE_QUESTIONS,
  GEO_SPACE_TEST_ID,
  GeoSpaceResult,
  GeoSpaceTrialResult,
  saveGeoSpaceResult,
} from '@/lib/geometry/geo-space'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import type { Json } from '@/lib/types/database'
import { toggleSelectionWithExclusive } from '@/lib/quiz-helpers'
import { scoreGeometryQuestion, computeFinalPercent } from '@/lib/geometry/scoring'
import { CapacityLegend } from '@/components/geometry/capacity-legend'
import { CapacityBreakdownCard } from '@/components/geometry/capacity-breakdown-card'
import { GeometryAnalyticsSummary } from '@/components/geometry/geometry-analytics-summary'
import { buildGeometrySessionMetadataFraction } from '@/lib/geometry/capacity-results'
import { buildGeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'

type Phase = 'intro' | 'instructions' | 'running' | 'done'

function arrayEquals(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const as = [...a].sort()
  const bs = [...b].sort()
  return as.every((v, i) => v === bs[i])
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

export function GeoSpaceQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<GeoSpaceTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)

  const question = GEO_SPACE_QUESTIONS[current]
  const isMulti =
    Array.isArray(question?.correctAnswer) &&
    (question.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(question.options, prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    if (selectedList.length === 0) return
    const q = GEO_SPACE_QUESTIONS[current]

    const score = scoreGeometryQuestion({
      options: q.options,
      selected: selectedList,
      correctAnswer: q.correctAnswer,
    })

    const trial: GeoSpaceTrialResult = {
      index: current,
      questionId: q.id,
      selected: selectedList[0],
      selectedList: [...selectedList],
      correct: score === 1,
      score,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])

    if (current + 1 >= GEO_SPACE_QUESTIONS.length) {
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
      const scorable = trials.filter((t) => {
        const q = GEO_SPACE_QUESTIONS[t.index]
        return q.correctAnswer !== null
      })
      const correct = scorable.filter((t) => t.correct).length
      const r: GeoSpaceResult = {
        id: `geospace-${Date.now()}`,
        userName: user?.username,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        trials,
        totalMs: Date.now() - startedAt,
        correctCount: correct,
        // Final percent uses the geometry-domain scoring rule: each question
        // contributes its [0, 1] score (with partial credit), summed and
        // normalised over the number of scorable items.
        score: computeFinalPercent(scorable.map((t) => t.score ?? 0)),
      }
      saveGeoSpaceResult(r)
      persistCompletedTestSessionBestEffort({
        testId: GEO_SPACE_TEST_ID,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalMs: r.totalMs,
        score: r.score,
        correctCount: r.correctCount,
        totalQuestions: GEO_SPACE_QUESTIONS.length,
        trials: r.trials.map((t) => ({
          question_index: t.index,
          question_id: t.questionId,
          selected: (t.selectedList?.length ? t.selectedList : [t.selected]) as Json,
          correct: t.correct,
          score: t.score ?? (t.correct ? 1 : 0),
          reaction_time_ms: t.reactionTimeMs,
        })),
        metadata: (() => {
          const geoPayload = buildGeometrySessionMetadataFraction({
            lessonTestId: GEO_SPACE_TEST_ID,
            questions: GEO_SPACE_QUESTIONS,
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: (i) => GEO_SPACE_QUESTIONS[i]?.correctAnswer !== null,
          })
          const geometryAnalytics = buildGeometryAnalyticsReport({
            testId: GEO_SPACE_TEST_ID,
            questions: GEO_SPACE_QUESTIONS,
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: (i) => GEO_SPACE_QUESTIONS[i]?.correctAnswer !== null,
            scoringMode: 'fraction',
          })
          return {
            source: 'geo-space-quiz',
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

  return (
    <TrialView
      index={current}
      total={GEO_SPACE_QUESTIONS.length}
      question={question}
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
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Box className="h-4 w-4" /> Géométrie dans l&apos;espace
        </div>
        <h1 className="mb-3 text-3xl font-bold">Géométrie dans l&apos;espace</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId={GEO_SPACE_TEST_ID} />
        </div>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Structure :</strong> 28 questions au total —
          Partie I (Q1–Q18) : questions du cours ; Partie II (Q19–Q28) : questions de raisonnement.
        </div>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Durée estimée :</strong> ~20 minutes. Certaines questions admettent plusieurs
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
            <strong>1.</strong> Lisez chaque question attentivement — les notations mathématiques
            sont affichées en LaTeX.
          </li>
          <li>
            <strong>2.</strong> Pour les questions à choix multiples, sélectionnez{' '}
            <em>toutes</em> les réponses correctes avant de valider.
          </li>
          <li>
            <strong>3.</strong> Cliquez « Valider » pour passer à la question suivante.
          </li>
          <li>
            <strong>4.</strong> Une réponse est correcte uniquement si toutes les bonnes options
            sont cochées (et aucune mauvaise).
          </li>
          <li>
            <strong>5.</strong> La Partie II (questions de raisonnement) demande de la déduction et
            peut contenir <em>plusieurs</em> bonnes réponses.
          </li>
        </ol>
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          💡 Visualisez mentalement le cube ou le tétraèdre avant de répondre aux questions
          configurées.
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
  question: (typeof GEO_SPACE_QUESTIONS)[number]
  selectedList: number[]
  isMulti: boolean
  onToggle: (idx: number) => void
  onSubmit: () => void
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
  const partLabel =
    question.part === 'course'
      ? 'Partie I — Questions du cours'
      : 'Partie II — Questions de raisonnement'

  const showPartBanner =
    index === 0 || GEO_SPACE_QUESTIONS[index - 1]?.part !== question.part

  return (
    <main className="container mx-auto max-w-4xl py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Question {index + 1} / {total}
        </h2>
        <div className="text-right">
          <span className="text-sm font-semibold text-indigo-600">{question.id}</span>
          {question.competencies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Compétence: {question.competencies.join(', ')}
            </p>
          )}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mb-6" />

      {showPartBanner && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${
            question.part === 'course'
              ? 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          }`}
        >
          <div>🧠 {partLabel}</div>
          {question.part === 'reasoning' && (
            <div className="mt-1 text-xs font-normal">
              Remarque : certaines questions peuvent contenir{' '}
              <strong>plusieurs bonnes réponses</strong>.
            </div>
          )}
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderInlineLatex(question.question) }}
          />

          {question.requiresImage && (
            <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              {question.imagePath ? (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {(Array.isArray(question.imagePath)
                    ? question.imagePath
                    : [question.imagePath]
                  ).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${question.id} — figure ${i + 1}`}
                      className="max-h-64 rounded border bg-white object-contain"
                    />
                  ))}
                </div>
              ) : (
                <span>📐 Figure de support — visualisez mentalement la configuration</span>
              )}
            </div>
          )}

          {isMulti && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
              ℹ️ Plusieurs réponses correctes possibles — cochez toutes les bonnes réponses.
            </div>
          )}

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
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center ${
                        isMulti ? 'rounded' : 'rounded-full'
                      } border-2 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
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

          <Button
            onClick={onSubmit}
            disabled={selectedList.length === 0}
            className="w-full"
            size="lg"
          >
            Valider <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </main>
  )
}

interface ResultsProps {
  trials: GeoSpaceTrialResult[]
  onExit: () => void
}

function Results({ trials, onExit }: ResultsProps) {
  const scorable = trials.filter((t) => {
    const q = GEO_SPACE_QUESTIONS[t.index]
    return q.correctAnswer !== null
  })
  const correct = scorable.filter((t) => t.correct).length
  const pct = scorable.length > 0 ? Math.round((correct / scorable.length) * 100) : 0

  const geo = buildGeometrySessionMetadataFraction({
    lessonTestId: GEO_SPACE_TEST_ID,
    questions: GEO_SPACE_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: (i) => GEO_SPACE_QUESTIONS[i]?.correctAnswer !== null,
  })

  const geometryAnalytics = buildGeometryAnalyticsReport({
    testId: GEO_SPACE_TEST_ID,
    questions: GEO_SPACE_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: (i) => GEO_SPACE_QUESTIONS[i]?.correctAnswer !== null,
    scoringMode: 'fraction',
  })

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-2 text-3xl font-bold">Test terminé</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Géométrie dans l&apos;espace — Résultats
        </p>
        <div className="mb-6 rounded-lg border bg-muted/30 p-6">
          <div className="text-5xl font-bold text-indigo-600">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {correct} / {scorable.length} réponses correctes
          </div>
        </div>
        <GeometryAnalyticsSummary report={geometryAnalytics} />
        <CapacityBreakdownCard
          testId={GEO_SPACE_TEST_ID}
          breakdown={geo.capacityBreakdown}
          unit="fraction"
        />
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recommencer
          </Button>
          <Button onClick={onExit}>
            <BarChart3 className="mr-2 h-4 w-4" /> Retour tableau de bord
          </Button>
        </div>
      </Card>
    </main>
  )
}
