'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart3, LineChart } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  DROITE_PLAN_QUESTIONS,
  DROITE_PLAN_TEST_ID,
  DROITE_PLAN_TYPE_LABELS,
  DroitePlanResult,
  DroitePlanTrialResult,
  saveDroitePlanResult,
} from '@/lib/geometry/droite-plan'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { scoreGeometryQuestion, computeFinalPercent } from '@/lib/geometry/scoring'
import { CapacityLegend } from '@/components/geometry/capacity-legend'
import { CapacityBreakdownCard } from '@/components/geometry/capacity-breakdown-card'
import { buildGeometrySessionMetadataFraction } from '@/lib/geometry/capacity-results'

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

export function DroitePlanQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<DroitePlanTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)

  const question = DROITE_PLAN_QUESTIONS[current]
  const isMulti =
    Array.isArray(question?.correctAnswer) &&
    (question.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    if (isMulti) {
      setSelectedList((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
      )
    } else {
      setSelectedList([idx])
    }
  }

  const submit = useCallback(() => {
    if (selectedList.length === 0) return
    const q = DROITE_PLAN_QUESTIONS[current]

    const multi =
      Array.isArray(q.correctAnswer) && (q.correctAnswer as number[]).length > 1

    const score = scoreGeometryQuestion({
      options: q.options,
      selected: selectedList,
      correctAnswer: q.correctAnswer,
    })

    const trial: DroitePlanTrialResult = {
      index: current,
      questionId: q.id,
      selected: multi ? [...selectedList] : selectedList[0],
      correct: score === 1,
      score,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])

    if (current + 1 >= DROITE_PLAN_QUESTIONS.length) {
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
        const q = DROITE_PLAN_QUESTIONS[t.index]
        return q.correctAnswer !== null && !q.isDiagnostic
      })
      const correct = scorable.filter((t) => t.correct).length
      const r: DroitePlanResult = {
        id: `dp-${Date.now()}`,
        userName: user?.username,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        trials,
        totalMs: Date.now() - startedAt,
        correctCount: correct,
        score: computeFinalPercent(scorable.map((t) => (t as { score?: number }).score ?? 0)),
      }
      saveDroitePlanResult(r)
      persistCompletedTestSessionBestEffort({
        testId: DROITE_PLAN_TEST_ID,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalMs: r.totalMs,
        score: r.score,
        correctCount: r.correctCount,
        totalQuestions: DROITE_PLAN_QUESTIONS.length,
        trials: r.trials.map((t) => ({
          question_index: t.index,
          question_id: t.questionId,
          selected: Array.isArray(t.selected) ? t.selected : [t.selected],
          correct: t.correct,
          score: t.score ?? (t.correct ? 1 : 0),
          reaction_time_ms: t.reactionTimeMs,
        })),
        metadata: {
          source: 'droite-plan-quiz',
          ...buildGeometrySessionMetadataFraction({
            lessonTestId: DROITE_PLAN_TEST_ID,
            questions: DROITE_PLAN_QUESTIONS.map((q) => ({
              id: q.id,
              competencies: q.competencies,
              part: q.isDiagnostic ? 'diagnostic' : `T${q.typeCode}`,
            })),
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: (i) => {
              const q = DROITE_PLAN_QUESTIONS[i]
              return q?.correctAnswer !== null && !q.isDiagnostic
            },
          }),
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
      total={DROITE_PLAN_QUESTIONS.length}
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
          <LineChart className="h-4 w-4" /> Droite dans le plan
        </div>
        <h1 className="mb-3 text-3xl font-bold">Droite dans le plan</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId={DROITE_PLAN_TEST_ID} />
        </div>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Structure :</strong> 13 questions —
          Partie I (Q1–Q6) cours, Partie II (Q7–Q9) construction,
          Partie III (Q10–Q13) raisonnement.
          La Q1 est une auto-évaluation et n&apos;est pas notée.
        </div>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Contexte :</strong> droite \( (\Delta)\!: 2x - 3y + 2 = 0 \), point \( A(2,\,-3) \).
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
            <strong>1.</strong> Q1 est une auto-évaluation — répondez sincèrement, elle n&apos;est
            pas comptée dans le score.
          </li>
          <li>
            <strong>2.</strong> Q2 utilise un repère orthonormé (O, I, J) — visualisez la
            configuration avant de répondre.
          </li>
          <li>
            <strong>3.</strong> À partir de Q3, chaque question propose 4 réponses parmi lesquelles
            une est correcte.
          </li>
          <li>
            <strong>4.</strong> Cliquez « Valider » pour passer à la question suivante.
          </li>
          <li>
            <strong>5.</strong> Le score final est calculé sur les Q2 → Q13 (Q1 exclue).
            Certaines questions (ex. Q2) admettent plusieurs bonnes réponses.
          </li>
        </ol>
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          💡 Pensez à vérifier : pour \( ax + by + c = 0 \), un vecteur directeur est \( (-b, a) \)
          et la pente est \( -a/b \).
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
  question: (typeof DROITE_PLAN_QUESTIONS)[number]
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
  const showPartBanner =
    index === 0 || DROITE_PLAN_QUESTIONS[index - 1]?.typeCode !== question.typeCode

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
            question.typeCode === 1
              ? 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200'
              : question.typeCode === 2
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          }`}
        >
          📐 {DROITE_PLAN_TYPE_LABELS[question.typeCode]}
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderInlineLatex(question.question) }}
          />

          {question.imagePath && (
            <div className="rounded-md border bg-white p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.imagePath}
                alt={`Figure ${question.id}`}
                className="mx-auto max-h-80"
              />
            </div>
          )}

          {question.isDiagnostic && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
              ℹ️ Auto-évaluation — non comptée dans le score final.
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
  trials: DroitePlanTrialResult[]
  onExit: () => void
}

function Results({ trials, onExit }: ResultsProps) {
  const scorable = trials.filter((t) => {
    const q = DROITE_PLAN_QUESTIONS[t.index]
    return q.correctAnswer !== null && !q.isDiagnostic
  })
  const correct = scorable.filter((t) => t.correct).length
  const pct = scorable.length > 0 ? Math.round((correct / scorable.length) * 100) : 0

  const byType = (code: 1 | 2 | 3) => {
    const items = scorable.filter(
      (t) => DROITE_PLAN_QUESTIONS[t.index].typeCode === code,
    )
    const ok = items.filter((t) => t.correct).length
    return { ok, total: items.length }
  }
  const t1 = byType(1)
  const t2 = byType(2)
  const t3 = byType(3)

  const geo = buildGeometrySessionMetadataFraction({
    lessonTestId: DROITE_PLAN_TEST_ID,
    questions: DROITE_PLAN_QUESTIONS.map((q) => ({
      id: q.id,
      competencies: q.competencies,
      part: q.isDiagnostic ? 'diagnostic' : `T${q.typeCode}`,
    })),
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: (i) => {
      const q = DROITE_PLAN_QUESTIONS[i]
      return q?.correctAnswer !== null && !q.isDiagnostic
    },
  })

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-2 text-3xl font-bold">Test terminé</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Droite dans le plan — Résultats
        </p>
        <div className="mb-6 rounded-lg border bg-muted/30 p-6">
          <div className="text-5xl font-bold text-indigo-600">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {correct} / {scorable.length} réponses correctes
          </div>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Cours (T1)</div>
            <div className="text-lg font-semibold">
              {t1.ok} / {t1.total}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Construction (T2)</div>
            <div className="text-lg font-semibold">
              {t2.ok} / {t2.total}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Raisonnement (T3)</div>
            <div className="text-lg font-semibold">
              {t3.ok} / {t3.total}
            </div>
          </div>
        </div>
        <CapacityBreakdownCard
          testId={DROITE_PLAN_TEST_ID}
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
