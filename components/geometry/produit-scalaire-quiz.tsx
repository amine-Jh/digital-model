'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart3, Compass } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  PRODUIT_SCALAIRE_LESSON_LABELS,
  PRODUIT_SCALAIRE_QUESTIONS,
  PRODUIT_SCALAIRE_TEST_ID,
  PRODUIT_SCALAIRE_TYPE_LABELS,
  ProduitScalaireResult,
  ProduitScalaireTrialResult,
  saveProduitScalaireResult,
} from '@/lib/geometry/produit-scalaire'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { toggleSelectionWithExclusive } from '@/lib/quiz-helpers'
import { InteractiveLinePlot, PlottedPoint } from '@/components/geometry/interactive-line-plot'
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

export function ProduitScalaireQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<ProduitScalaireTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [freeText, setFreeText] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)

  const question = PRODUIT_SCALAIRE_QUESTIONS[current]
  const isMulti =
    Array.isArray(question?.correctAnswer) &&
    (question.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(question.options, prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    const q = PRODUIT_SCALAIRE_QUESTIONS[current]

    // open-ended, interactive, or diagnostic items: record and skip scoring
    if (q.isOpenEnded || q.isDiagnostic || q.interactiveLine) {
      const trial: ProduitScalaireTrialResult = {
        index: current,
        questionId: q.id,
        selected: selectedList,
        freeText: q.isOpenEnded || q.interactiveLine ? freeText : undefined,
        correct: false,
        reactionTimeMs: Date.now() - trialStart.current,
      }
      setTrials((t) => [...t, trial])
      setSelectedList([])
      setFreeText('')
      setShowHint(false)
      if (current + 1 >= PRODUIT_SCALAIRE_QUESTIONS.length) {
        setPhase('done')
      } else {
        setCurrent((n) => n + 1)
        setTimeout(() => {
          trialStart.current = Date.now()
        }, 100)
      }
      return
    }

    if (selectedList.length === 0) return

    const score = scoreGeometryQuestion({
      options: q.options,
      selected: selectedList,
      correctAnswer: q.correctAnswer,
    })

    const trial: ProduitScalaireTrialResult = {
      index: current,
      questionId: q.id,
      selected: selectedList,
      correct: score === 1,
      score,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])
    setFreeText('')
    setShowHint(false)

    if (current + 1 >= PRODUIT_SCALAIRE_QUESTIONS.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setTimeout(() => {
        trialStart.current = Date.now()
      }, 100)
    }
  }, [current, selectedList, freeText])

  useEffect(() => {
    if (phase === 'done' && trials.length > 0) {
      const scorable = trials.filter((t) => {
        const q = PRODUIT_SCALAIRE_QUESTIONS[t.index]
        return (
          q.correctAnswer !== null &&
          !q.isDiagnostic &&
          !q.isOpenEnded &&
          !q.interactiveLine
        )
      })
      const correct = scorable.filter((t) => t.correct).length
      const r: ProduitScalaireResult = {
        id: `ps-${Date.now()}`,
        userName: user?.username,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        trials,
        totalMs: Date.now() - startedAt,
        correctCount: correct,
        score: computeFinalPercent(scorable.map((t) => t.score ?? 0)),
      }
      saveProduitScalaireResult(r)
      persistCompletedTestSessionBestEffort({
        testId: PRODUIT_SCALAIRE_TEST_ID,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        totalMs: r.totalMs,
        score: r.score,
        correctCount: r.correctCount,
        totalQuestions: PRODUIT_SCALAIRE_QUESTIONS.length,
        trials: r.trials.map((t) => ({
          question_index: t.index,
          question_id: t.questionId,
          selected: t.selected,
          free_text: t.freeText ?? null,
          correct: t.correct,
          score: t.score ?? (t.correct ? 1 : 0),
          reaction_time_ms: t.reactionTimeMs,
        })),
        metadata: (() => {
          const geoPayload = buildGeometrySessionMetadataFraction({
            lessonTestId: PRODUIT_SCALAIRE_TEST_ID,
            questions: PRODUIT_SCALAIRE_QUESTIONS.map((q) => ({
              id: q.id,
              competencies: q.competencies,
              part: `T${q.typeCode}-D${q.lessonCode}`,
            })),
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: (i) => {
              const q = PRODUIT_SCALAIRE_QUESTIONS[i]
              return (
                q?.correctAnswer !== null &&
                !q.isDiagnostic &&
                !q.isOpenEnded &&
                !q.interactiveLine
              )
            },
          })
          const geometryAnalytics = buildGeometryAnalyticsReport({
            testId: PRODUIT_SCALAIRE_TEST_ID,
            questions: PRODUIT_SCALAIRE_QUESTIONS,
            trials: r.trials.map((t) => ({
              index: t.index,
              questionId: t.questionId,
              score: t.score ?? (t.correct ? 1 : 0),
              correct: t.correct,
            })),
            isScorableIndex: (i) => {
              const q = PRODUIT_SCALAIRE_QUESTIONS[i]
              return (
                q?.correctAnswer !== null &&
                !q.isDiagnostic &&
                !q.isOpenEnded &&
                !q.interactiveLine
              )
            },
            scoringMode: 'fraction',
          })
          return {
            source: 'produit-scalaire-quiz',
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
      total={PRODUIT_SCALAIRE_QUESTIONS.length}
      question={question}
      selectedList={selectedList}
      isMulti={isMulti}
      freeText={freeText}
      showHint={showHint}
      onToggle={toggleSelect}
      onChangeFreeText={setFreeText}
      onToggleHint={() => setShowHint((s) => !s)}
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
          <Compass className="h-4 w-4" /> Produit scalaire & Géométrie analytique
        </div>
        <h1 className="mb-3 text-3xl font-bold">Produit scalaire</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId={PRODUIT_SCALAIRE_TEST_ID} />
        </div>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Structure :</strong> 26 questions —
          Partie I (Q1–Q9) cours, Partie II (Q10–Q17) visualisation,
          Partie III (Q18–Q26) raisonnement.
          La Q1 est une auto-évaluation et n&apos;est pas notée.
        </div>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Contexte de la Partie III :</strong>{' '}
          droite \( \Delta:\ 2x - 3y + 2 = 0 \) et point \( A(2,-3) \).
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
            <strong>2.</strong> Certaines questions admettent <em>plusieurs</em> bonnes réponses ;
            elles sont signalées et utilisent des cases à cocher.
          </li>
          <li>
            <strong>3.</strong> Les questions de la Partie II s&apos;appuient sur des figures —
            lisez attentivement les coordonnées avant de répondre.
          </li>
          <li>
            <strong>4.</strong> Quelques questions sont ouvertes (saisie libre) : elles ne
            sont pas notées automatiquement, mais votre réponse est conservée pour relecture.
          </li>
          <li>
            <strong>5.</strong> Cliquez « Valider » pour passer à la question suivante.
          </li>
        </ol>
        <div
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30"
          dangerouslySetInnerHTML={{
            __html: renderInlineLatex(
              '💡 Rappels : \\( \\vec{U}\\cdot\\vec{V} = ab + cd \\) (en repère orthonormé) et la distance d\'un point à une droite \\( ax + by + c = 0 \\) est \\( \\dfrac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}} \\).',
            ),
          }}
        />
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
  question: (typeof PRODUIT_SCALAIRE_QUESTIONS)[number]
  selectedList: number[]
  isMulti: boolean
  freeText: string
  showHint: boolean
  onToggle: (idx: number) => void
  onChangeFreeText: (v: string) => void
  onToggleHint: () => void
  onSubmit: () => void
}

function TrialView({
  index,
  total,
  question,
  selectedList,
  isMulti,
  freeText,
  showHint,
  onToggle,
  onChangeFreeText,
  onToggleHint,
  onSubmit,
}: TrialViewProps) {
  const showPartBanner =
    index === 0 || PRODUIT_SCALAIRE_QUESTIONS[index - 1]?.typeCode !== question.typeCode

  const lessonLabel = PRODUIT_SCALAIRE_LESSON_LABELS[question.lessonCode]

  // Special split layout for Partie II questions that carry a figure.
  const splitLayout = question.typeCode === 2 && Boolean(question.imagePath)

  return (
    <main className="container mx-auto max-w-5xl py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Question {index + 1} / {total}
        </h2>
        <div className="text-right">
          <span className="text-sm font-semibold text-indigo-600">{question.id}</span>
          <p className="text-xs text-muted-foreground">
            Leçon : {lessonLabel}
            {question.competencies.length > 0 && (
              <> · Compétence : {question.competencies.join(', ')}</>
            )}
          </p>
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
          📐 {PRODUIT_SCALAIRE_TYPE_LABELS[question.typeCode]}
        </div>
      )}

      <Card className="p-6">
        <div
          className={
            splitLayout
              ? 'grid gap-6 md:grid-cols-2'
              : 'space-y-6'
          }
        >
          {splitLayout && question.imagePath && (
            <div className="rounded-md border bg-white p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.imagePath}
                alt={`Figure ${question.id}`}
                className="mx-auto max-h-96 w-full object-contain"
              />
            </div>
          )}

          <div className="space-y-6">
            <div
              className="text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderInlineLatex(question.question) }}
            />

            {!splitLayout && question.imagePath && (
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

            {question.isOpenEnded && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
                ✍️ Question ouverte — saisissez votre réponse. Elle n&apos;est pas notée
                automatiquement, mais sera conservée pour la relecture par l&apos;enseignant.
              </div>
            )}

            {isMulti && (
              <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
                ℹ️ Plusieurs réponses correctes possibles — cochez toutes les bonnes réponses.
              </div>
            )}

            {question.interactiveLine ? (
              <div className="space-y-3">
                <InteractiveLinePlot
                  equation={question.interactiveLine.equation}
                  onChange={(pts) =>
                    onChangeFreeText(
                      pts.map((p) => `(${p.x},${p.y})`).join(' ; '),
                    )
                  }
                />
                <textarea
                  value={freeText}
                  onChange={(e) => onChangeFreeText(e.target.value)}
                  rows={2}
                  placeholder="Coordonnées des deux points placés…"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            ) : question.isOpenEnded ? (
              <div className="space-y-3">
                <textarea
                  value={freeText}
                  onChange={(e) => onChangeFreeText(e.target.value)}
                  rows={5}
                  placeholder="Votre réponse… (format \\( (x, y) \\) ou \\( (x, y, z) \\))"
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            ) : (
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
            )}

            <Button
              onClick={onSubmit}
              disabled={
                !question.isOpenEnded &&
                !question.isDiagnostic &&
                !question.interactiveLine &&
                selectedList.length === 0
              }
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
  trials: ProduitScalaireTrialResult[]
  onExit: () => void
}

function Results({ trials, onExit }: ResultsProps) {
  const scorable = trials.filter((t) => {
    const q = PRODUIT_SCALAIRE_QUESTIONS[t.index]
    return (
      q.correctAnswer !== null &&
      !q.isDiagnostic &&
      !q.isOpenEnded &&
      !q.interactiveLine
    )
  })
  const correct = scorable.filter((t) => t.correct).length
  const pct = scorable.length > 0 ? Math.round((correct / scorable.length) * 100) : 0

  const byType = (code: 1 | 2 | 3) => {
    const items = scorable.filter(
      (t) => PRODUIT_SCALAIRE_QUESTIONS[t.index].typeCode === code,
    )
    const ok = items.filter((t) => t.correct).length
    return { ok, total: items.length }
  }
  const byLesson = (code: 1 | 2) => {
    const items = scorable.filter(
      (t) => PRODUIT_SCALAIRE_QUESTIONS[t.index].lessonCode === code,
    )
    const ok = items.filter((t) => t.correct).length
    return { ok, total: items.length }
  }
  const t1 = byType(1)
  const t2 = byType(2)
  const t3 = byType(3)
  const d1 = byLesson(1)
  const d2 = byLesson(2)

  const geo = buildGeometrySessionMetadataFraction({
    lessonTestId: PRODUIT_SCALAIRE_TEST_ID,
    questions: PRODUIT_SCALAIRE_QUESTIONS.map((q) => ({
      id: q.id,
      competencies: q.competencies,
      part: `T${q.typeCode}-D${q.lessonCode}`,
    })),
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: (i) => {
      const q = PRODUIT_SCALAIRE_QUESTIONS[i]
      return (
        q?.correctAnswer !== null &&
        !q.isDiagnostic &&
        !q.isOpenEnded &&
        !q.interactiveLine
      )
    },
  })

  const geometryAnalytics = buildGeometryAnalyticsReport({
    testId: PRODUIT_SCALAIRE_TEST_ID,
    questions: PRODUIT_SCALAIRE_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      score: t.score ?? (t.correct ? 1 : 0),
      correct: t.correct,
    })),
    isScorableIndex: (i) => {
      const q = PRODUIT_SCALAIRE_QUESTIONS[i]
      return (
        q?.correctAnswer !== null &&
        !q.isDiagnostic &&
        !q.isOpenEnded &&
        !q.interactiveLine
      )
    },
    scoringMode: 'fraction',
  })

  const openCount = trials.filter(
    (t) => PRODUIT_SCALAIRE_QUESTIONS[t.index].isOpenEnded,
  ).length

  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-2 text-3xl font-bold">Test terminé</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Produit scalaire & Géométrie analytique — Résultats
        </p>
        <div className="mb-6 rounded-lg border bg-muted/30 p-6">
          <div className="text-5xl font-bold text-indigo-600">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {correct} / {scorable.length} réponses correctes (auto-notées)
          </div>
          {openCount > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              + {openCount} question{openCount > 1 ? 's' : ''} ouverte
              {openCount > 1 ? 's' : ''} à corriger manuellement
            </div>
          )}
        </div>

        <GeometryAnalyticsSummary report={geometryAnalytics} />

        <h3 className="mb-2 text-left text-sm font-semibold text-muted-foreground">
          Par partie
        </h3>
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Cours (T1)</div>
            <div className="text-lg font-semibold">
              {t1.ok} / {t1.total}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">Visualisation (T2)</div>
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

        <h3 className="mb-2 text-left text-sm font-semibold text-muted-foreground">
          Par leçon
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">D1 — Produit scalaire</div>
            <div className="text-lg font-semibold">
              {d1.ok} / {d1.total}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-muted-foreground">D2 — Géométrie analytique</div>
            <div className="text-lg font-semibold">
              {d2.ok} / {d2.total}
            </div>
          </div>
        </div>

        <CapacityBreakdownCard
          testId={PRODUIT_SCALAIRE_TEST_ID}
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
