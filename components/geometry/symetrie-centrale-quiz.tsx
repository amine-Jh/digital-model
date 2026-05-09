'use client'
/**
 * Symétrie centrale — One-way navigation quiz (mode examen sécurisé).
 *
 *  ⚠️  Pas de retour arrière : une fois la question validée, elle est
 *      verrouillée. Aucune révision possible.
 *
 *  Q7 → Q13 partagent la même figure SVG (centre I).
 *  Q16 — image-choice : 2 figures candidates pour la construction.
 *  Q17 — figure obligatoire 'figure-iso' (triangle A'B'C').
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import KaTeX from 'katex'
import 'katex/dist/katex.min.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Lock,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  SYMETRIE_CENTRALE_QUESTIONS,
  SYMETRIE_CENTRALE_TEST_ID,
  SymCentraleQuestion,
  SymCentraleResult,
  SymCentraleTrialResult,
  saveSymCentraleResult,
  gradeAnswer,
  levelFor,
  FigureKey,
} from '@/lib/geometry/symetrie-centrale'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { CapacityLegend } from '@/components/geometry/capacity-legend'
import { CapacityBreakdownCard } from '@/components/geometry/capacity-breakdown-card'
import { GeometryAnalyticsSummary } from '@/components/geometry/geometry-analytics-summary'
import { buildGeometrySessionMetadataPoints } from '@/lib/geometry/capacity-results'
import { buildGeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'
import { isExcludedFromGeometryScoreAndAverage } from '@/lib/geometry/geometry-scoring-exclusions'
import { toggleSelectionWithExclusive } from '@/lib/quiz-helpers'

function isSymCentraleScorableIndex(i: number): boolean {
  const q = SYMETRIE_CENTRALE_QUESTIONS[i]
  return Boolean(
    q && !isExcludedFromGeometryScoreAndAverage(q) && q.points > 0,
  )
}

type Phase = 'intro' | 'instructions' | 'running' | 'done'

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

export function SymetrieCentraleQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<SymCentraleTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState(0)
  const trialStart = useRef(0)

  const question = SYMETRIE_CENTRALE_QUESTIONS[current]
  const isMulti = question?.kind === 'multi'

  // Browser back-button protection during running phase.
  useEffect(() => {
    if (phase !== 'running') return
    const block = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue =
        'Le test est en cours. Vous ne pouvez pas revenir en arrière.'
    }
    window.addEventListener('beforeunload', block)

    // Push a sentinel state so that the browser back arrow stays on the page.
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('beforeunload', block)
      window.removeEventListener('popstate', onPop)
    }
  }, [phase])

  const toggleSelect = (idx: number) => {
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(question?.options ?? [], prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    if (selectedList.length === 0) return
    const q = SYMETRIE_CENTRALE_QUESTIONS[current]
    const excluded = isExcludedFromGeometryScoreAndAverage(q)
    const correct = !excluded && gradeAnswer(q, selectedList)
    const pointsEarned = correct ? q.points : 0

    const trial: SymCentraleTrialResult = {
      index: current,
      questionId: q.id,
      selected: [...selectedList],
      correct,
      pointsEarned,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])

    if (current + 1 >= SYMETRIE_CENTRALE_QUESTIONS.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setTimeout(() => {
        trialStart.current = Date.now()
      }, 100)
    }
  }, [current, selectedList])

  // Persist result on completion
  useEffect(() => {
    if (phase !== 'done' || trials.length === 0) return
    let scoreC1 = 0
    let maxC1 = 0
    let scoreC2 = 0
    let maxC2 = 0
    for (const t of trials) {
      const q = SYMETRIE_CENTRALE_QUESTIONS[t.index]
      if (!isSymCentraleScorableIndex(t.index)) continue
      if (q.competency === 'C1') {
        maxC1 += q.points
        scoreC1 += t.pointsEarned
      } else if (q.competency === 'C2') {
        maxC2 += q.points
        scoreC2 += t.pointsEarned
      }
    }
    const totalScore = scoreC1 + scoreC2
    const maxScore = maxC1 + maxC2
    const totalPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const geoPayload = buildGeometrySessionMetadataPoints({
      lessonTestId: SYMETRIE_CENTRALE_TEST_ID,
      perQuestion: trials.map((t) => {
        const q = SYMETRIE_CENTRALE_QUESTIONS[t.index]
        const sc = isSymCentraleScorableIndex(t.index)
        return {
          questionId: t.questionId,
          capacityCodes: q.competency ? [q.competency] : [],
          part: null,
          score: sc ? t.pointsEarned : 0,
          correct: sc && t.correct,
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
      testId: SYMETRIE_CENTRALE_TEST_ID,
      questions: SYMETRIE_CENTRALE_QUESTIONS,
      trials: trials.map((t) => ({
        index: t.index,
        questionId: t.questionId,
        correct: t.correct,
        pointsEarned: t.pointsEarned,
      })),
      isScorableIndex: isSymCentraleScorableIndex,
      scoringMode: 'points',
    })
    const r: SymCentraleResult = {
      id: `symc-${Date.now()}`,
      userName: user?.username,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      trials,
      totalMs: Date.now() - startedAt,
      scoreC1,
      maxC1,
      scoreC2,
      maxC2,
      totalScore,
      maxScore,
      level: levelFor(totalScore),
    }
    saveSymCentraleResult(r)
    persistCompletedTestSessionBestEffort({
      testId: SYMETRIE_CENTRALE_TEST_ID,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalMs: r.totalMs,
      score: r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0,
      correctCount: r.trials.filter(
        (t) => isSymCentraleScorableIndex(t.index) && t.correct,
      ).length,
      totalQuestions: SYMETRIE_CENTRALE_QUESTIONS.filter((_, i) =>
        isSymCentraleScorableIndex(i),
      ).length,
      trials: r.trials.map((t) => ({
        question_index: t.index,
        question_id: t.questionId,
        selected: t.selected,
        correct: t.correct,
        score: t.correct ? 1 : Math.min(1, t.pointsEarned / 4),
        reaction_time_ms: t.reactionTimeMs,
      })),
      metadata: {
        source: 'symetrie-centrale-quiz',
        level: r.level,
        ...geoPayload,
        geometryAnalytics,
      },
    })
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
      total={SYMETRIE_CENTRALE_QUESTIONS.length}
      question={question}
      selectedList={selectedList}
      isMulti={isMulti}
      onToggle={toggleSelect}
      onSubmit={submit}
    />
  )
}

// ─── Intro ──────────────────────────────────────────────────────────────────
function Intro({ onStart, onQuit }: { onStart: () => void; onQuit: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button variant="ghost" size="sm" onClick={onQuit} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
      </Button>
      <Card className="p-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-rose-600">
          <ShieldAlert className="h-4 w-4" /> Symétrie centrale
        </div>
        <h1 className="mb-3 text-3xl font-bold">
          Symétrie centrale — Évaluation cognitive
        </h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Référentiel : programme national marocain (Tronc commun),
          décision ministérielle 2.853.06.
        </p>
        <div className="mb-4">
          <CapacityLegend testId={SYMETRIE_CENTRALE_TEST_ID} />
        </div>
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Barème :</strong> trois auto-évaluations (non comptées) · C1 = 12 pts ·
          C2 = 8 pts · <strong>Total / 20</strong>.
        </div>
        <div className="mb-6 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          <Lock className="mr-1 inline h-3 w-3" />{' '}
          <strong>Mode examen :</strong> navigation linéaire stricte. Une fois
          une question validée, vous ne pouvez plus revenir en arrière.
        </div>
        <Button onClick={onStart}>
          Commencer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

// ─── Instructions ───────────────────────────────────────────────────────────
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
            <strong>1.</strong> Les <em>auto-évaluations</em> (rappel de cours,
            difficultés, ressenti sur la démonstration) ne comptent pas dans le
            score ni dans les moyennes.
          </li>
          <li>
            <strong>2.</strong> Les questions Q7 à Q13 utilisent une{' '}
            <em>figure commune</em> avec un centre \( I \).
          </li>
          <li>
            <strong>3.</strong> Q16 propose deux figures de construction —
            choisissez celle qui correspond exactement à l&apos;énoncé.
            Q17 affiche la figure obligatoire du triangle A&apos;B&apos;C&apos;.
          </li>
          <li>
            <strong>4.</strong> Quatre formats : QCM, Vrai/Faux, cases à
            cocher (plusieurs réponses correctes), et choix d&apos;image.
          </li>
          <li>
            <strong>5.</strong> Pour les questions à cases à cocher, toutes les
            bonnes options doivent être cochées.
          </li>
          <li className="text-rose-700 dark:text-rose-300">
            <strong>6.</strong> Une fois validée, la question est verrouillée :{' '}
            <strong>aucun retour arrière n&apos;est possible</strong>.
          </li>
        </ol>
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
          💡 Lisez attentivement chaque énoncé avant de valider — vous ne
          pourrez pas modifier votre réponse ensuite.
        </div>
        <Button onClick={onBegin}>
          Commencer le test <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

// ─── Trial view ─────────────────────────────────────────────────────────────
interface TrialViewProps {
  index: number
  total: number
  question: SymCentraleQuestion
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
  return (
    <main className="container mx-auto max-w-4xl py-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Question {index + 1} / {total}
        </h2>
        <div className="text-right">
          <span className="text-sm font-semibold text-rose-600">
            {question.id}
          </span>
          {question.competency && question.points > 0 && (
            <p className="text-xs text-muted-foreground">
              Compétence : {question.competency} ·{' '}
              {question.points} pt{question.points > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mb-4" />

      <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
        <Lock className="h-3 w-3" /> Mode examen — pas de retour arrière après
        validation.
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderInlineLatex(question.question),
            }}
          />

          {question.figure && <FigureRenderer kind={question.figure} />}

          {(question.isDiagnostic || question.isAutoeval) && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30">
              ℹ️ Auto-évaluation — non comptée dans le score final.
            </div>
          )}

          {isMulti && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30">
              ℹ️ Plusieurs réponses correctes — cochez toutes les bonnes.
            </div>
          )}

          {question.kind === 'image-choice' && question.optionImages ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {question.optionImages.map((src, idx) => {
                const isSelected = selectedList.includes(idx)
                const label = question.options[idx] ?? `Figure ${idx + 1}`
                return (
                  <button
                    key={idx}
                    onClick={() => onToggle(idx)}
                    className={`overflow-hidden rounded-lg border-2 bg-white p-3 text-center transition-all ${
                      isSelected
                        ? 'border-rose-500 ring-2 ring-rose-300'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={label}
                      className="mx-auto max-h-64 w-auto"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement
                        t.style.display = 'none'
                        const parent = t.parentElement
                        if (parent && !parent.querySelector('.img-fallback')) {
                          const div = document.createElement('div')
                          div.className =
                            'img-fallback p-8 text-xs text-muted-foreground'
                          div.textContent = `Image manquante : ${src}`
                          parent.appendChild(div)
                        }
                      }}
                    />
                    <div className="mt-2 text-sm font-semibold">
                      {String.fromCharCode(65 + idx)}. {label}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const isSelected = selectedList.includes(idx)
                const label =
                  question.kind === 'truefalse'
                    ? option
                    : `${String.fromCharCode(65 + idx)}. ${option}`
                return (
                  <button
                    key={idx}
                    onClick={() => onToggle(idx)}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center ${
                          isMulti ? 'rounded' : 'rounded-full'
                        } border-2 ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1">
                        <div
                          className="font-semibold text-gray-900 dark:text-white"
                          dangerouslySetInnerHTML={{
                            __html: renderInlineLatex(label),
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
            disabled={selectedList.length === 0}
            className="w-full"
            size="lg"
          >
            Valider et passer à la suivante{' '}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </main>
  )
}

// ─── Figure renderer ────────────────────────────────────────────────────────
//
// Pour utiliser vos propres images, déposez-les dans
//   public/images/geometry/symetrie-centrale/<nom>.png
// puis remplacez l'URL ci-dessous (ou supprimez le fallback pour passer
// uniquement par le SVG inline).

const FIGURE_OVERRIDES: Partial<Record<FigureKey, string>> = {
  'shared-i': '/images/geometry/symetrie-centrale/shared-i.png',
  'figure-iso': '/images/geometry/symetrie-centrale/figure-iso.png',
}

function FigureRenderer({ kind }: { kind: FigureKey }) {
  const override = FIGURE_OVERRIDES[kind]
  if (override) {
    return (
      <div className="rounded-md border bg-white p-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={override}
          alt={`Figure ${kind}`}
          className="mx-auto max-h-80"
          onError={(e) => {
            // Fall back to inline SVG if the override image is missing.
            const t = e.target as HTMLImageElement
            t.style.display = 'none'
          }}
        />
      </div>
    )
  }
  if (kind === 'shared-i') return <SharedFigureI />
  if (kind === 'figure-iso') return <FigureIso />
  return null
}

/** Q7-Q13 shared figure — center I with several labelled points & their images. */
function SharedFigureI() {
  // Coordinate system: I = (200, 140) in viewBox 400x280
  const I = { x: 200, y: 140 }
  const A = { x: 95, y: 75 }
  const Aprime = { x: 305, y: 205 }
  const B = { x: 280, y: 60 }
  const Bprime = { x: 120, y: 220 }
  const C = { x: 80, y: 175 }
  const Cprime = { x: 320, y: 105 }
  const M = { x: 240, y: 230 }

  const dot = (
    p: { x: number; y: number },
    label: string,
    color = '#111',
    dx = 8,
    dy = -8,
  ) => (
    <g key={label}>
      <circle cx={p.x} cy={p.y} r={4} fill={color} />
      <text x={p.x + dx} y={p.y + dy} fontSize={13} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  )

  const seg = (p: { x: number; y: number }, q: { x: number; y: number }, dashed = true) => (
    <line
      x1={p.x}
      y1={p.y}
      x2={q.x}
      y2={q.y}
      stroke="#9ca3af"
      strokeWidth={1}
      strokeDasharray={dashed ? '4 3' : undefined}
    />
  )

  return (
    <div className="rounded-md border bg-white p-3">
      <svg viewBox="0 0 400 280" className="mx-auto block w-full max-w-md">
        <rect width="400" height="280" fill="#fafafa" />
        {/* Symmetry segments through I (dashed) */}
        {seg(A, Aprime)}
        {seg(B, Bprime)}
        {seg(C, Cprime)}
        {/* Center */}
        <circle cx={I.x} cy={I.y} r={5} fill="#dc2626" />
        <text x={I.x + 8} y={I.y - 8} fontSize={14} fontWeight={800} fill="#dc2626">
          I
        </text>
        {/* Points and labels */}
        {dot(A, 'A', '#1d4ed8', -14, -6)}
        {dot(Aprime, "A'", '#1d4ed8')}
        {dot(B, 'B', '#16a34a')}
        {dot(Bprime, "B'", '#16a34a', -18, -4)}
        {dot(C, 'C', '#b45309', -14, -4)}
        {dot(Cprime, "C'", '#b45309')}
        {dot(M, 'M', '#6b7280')}
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Figure commune Q7–Q13 — centre <strong>I</strong> ; les paires{' '}
        (A, A&apos;), (B, B&apos;), (C, C&apos;) sont symétriques par rapport à I.
      </p>
    </div>
  )
}

/**
 * Q17 figure — triangle équilatéral ABC + triangle A'B'C' obtenu par
 * symétries centrales par rapport aux milieux des côtés (E, G, K).
 * A' = sym de A par rapport à K (milieu de [BC])  → A' = B + C − A
 * B' = sym de B par rapport à E (milieu de [AC])  → B' = A + C − B
 * C' = sym de C par rapport à G (milieu de [AB])  → C' = A + B − C
 */
function FigureIso() {
  const A = { x: 200, y: 60 }
  const B = { x: 100, y: 230 }
  const C = { x: 300, y: 230 }
  const E = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }
  const G = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
  const K = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }
  const Ap = { x: B.x + C.x - A.x, y: B.y + C.y - A.y }
  const Bp = { x: A.x + C.x - B.x, y: A.y + C.y - B.y }
  const Cp = { x: A.x + B.x - C.x, y: A.y + B.y - C.y }

  const dot = (
    p: { x: number; y: number },
    label: string,
    color = '#111',
    dx = 8,
    dy = -8,
  ) => (
    <g key={label}>
      <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
      <text x={p.x + dx} y={p.y + dy} fontSize={13} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  )

  return (
    <div className="rounded-md border bg-white p-3">
      <svg viewBox="0 0 400 360" className="mx-auto block w-full max-w-md">
        <rect width="400" height="360" fill="#fafafa" />
        {/* Triangle A'B'C' (extérieur) */}
        <polygon
          points={`${Ap.x},${Ap.y} ${Bp.x},${Bp.y} ${Cp.x},${Cp.y}`}
          fill="#fef3c7"
          stroke="#d97706"
          strokeWidth={1.6}
        />
        {/* Triangle ABC (intérieur, équilatéral) */}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="#eef2ff"
          stroke="#4f46e5"
          strokeWidth={1.8}
        />
        {/* Midpoint markers */}
        {dot(E, 'E', '#dc2626', 8, -6)}
        {dot(G, 'G', '#dc2626', -16, -6)}
        {dot(K, 'K', '#dc2626', 0, 16)}
        {/* Triangle ABC vertices */}
        {dot(A, 'A', '#111', -4, -10)}
        {dot(B, 'B', '#111', -16, 8)}
        {dot(C, 'C', '#111', 8, 8)}
        {/* Triangle A'B'C' vertices */}
        {dot(Ap, "A'", '#b45309', 8, 16)}
        {dot(Bp, "B'", '#b45309', 8, -6)}
        {dot(Cp, "C'", '#b45309', -18, -6)}
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Q17 — Triangle <strong>ABC</strong> équilatéral et son image{' '}
        <strong>A&apos;B&apos;C&apos;</strong> obtenue par symétries centrales
        de centres E, G, K (milieux des côtés).
      </p>
    </div>
  )
}

// ─── Results screen ─────────────────────────────────────────────────────────
function Results({
  trials,
  onExit,
}: {
  trials: SymCentraleTrialResult[]
  onExit: () => void
}) {
  let scoreC1 = 0
  let maxC1 = 0
  let scoreC2 = 0
  let maxC2 = 0
  for (const t of trials) {
    const q = SYMETRIE_CENTRALE_QUESTIONS[t.index]
    if (!isSymCentraleScorableIndex(t.index)) continue
    if (q.competency === 'C1') {
      maxC1 += q.points
      scoreC1 += t.pointsEarned
    } else if (q.competency === 'C2') {
      maxC2 += q.points
      scoreC2 += t.pointsEarned
    }
  }
  const total = scoreC1 + scoreC2
  const max = maxC1 + maxC2

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
    testId: SYMETRIE_CENTRALE_TEST_ID,
    questions: SYMETRIE_CENTRALE_QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      correct: t.correct,
      pointsEarned: t.pointsEarned,
    })),
    isScorableIndex: isSymCentraleScorableIndex,
    scoringMode: 'points',
  })

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-2 text-3xl font-bold">Test terminé</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Symétrie centrale — Résultats
        </p>

        <div className="mb-6 rounded-lg border bg-muted/30 p-6">
          <div className="text-5xl font-bold text-rose-600">
            {total} / {max}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">Score global (points)</div>
        </div>

        <GeometryAnalyticsSummary report={geometryAnalytics} />

        <CapacityBreakdownCard
          testId={SYMETRIE_CENTRALE_TEST_ID}
          breakdown={breakdown}
          unit="points"
        />

        <div className="flex justify-center gap-3">
          <Button onClick={onExit}>
            <BarChart3 className="mr-2 h-4 w-4" /> Retour tableau de bord
          </Button>
        </div>
      </Card>
    </main>
  )
}
