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
  SPACE_VOLUMES_LIVE_QUESTIONS,
  SPACE_VOLUMES_TEST_ID,
  type SpaceVolumesFigure,
  type SpaceVolumesQuestion,
  type SpaceVolumesResult,
  type SpaceVolumesTrialResult,
  saveSpaceVolumesResult,
} from '@/lib/geometry/space-volumes'
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

const QUESTIONS = SPACE_VOLUMES_LIVE_QUESTIONS

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

function isScorableIndex(i: number): boolean {
  const q = QUESTIONS[i]
  if (!q) return false
  return !isExcludedFromGeometryScoreAndAverage(q) && (q.points ?? 0) > 0
}

export function SpaceVolumesQuiz() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [trials, setTrials] = useState<SpaceVolumesTrialResult[]>([])
  const [selectedList, setSelectedList] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState(0)
  const trialStart = useRef(0)

  const question = QUESTIONS[current]
  const isMulti =
    Array.isArray(question?.correctAnswer) &&
    (question.correctAnswer as number[]).length > 1

  const toggleSelect = (idx: number) => {
    if (!question) return
    setSelectedList((prev) =>
      toggleSelectionWithExclusive(question.options, prev, idx, isMulti),
    )
  }

  const submit = useCallback(() => {
    if (selectedList.length === 0) return
    const q = QUESTIONS[current]
    const excluded = isExcludedFromGeometryScoreAndAverage(q)
    const score = excluded
      ? 0
      : scoreGeometryQuestion({
          options: q.options,
          selected: selectedList,
          correctAnswer: q.correctAnswer,
        })
    const pts = q.points ?? 0
    const trial: SpaceVolumesTrialResult = {
      index: current,
      questionId: q.id,
      selected: [...selectedList],
      correct: !excluded && score === 1,
      score,
      pointsEarned: excluded || pts === 0 ? 0 : score * pts,
      reactionTimeMs: Date.now() - trialStart.current,
    }
    setTrials((t) => [...t, trial])
    setSelectedList([])
    if (current + 1 >= QUESTIONS.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setTimeout(() => {
        trialStart.current = Date.now()
      }, 100)
    }
  }, [current, selectedList])

  useEffect(() => {
    if (phase !== 'done' || trials.length === 0) return
    let scorePoints = 0
    let maxScorePoints = 0
    let correctCount = 0
    const perQuestion = trials.map((t) => {
      const q = QUESTIONS[t.index]
      const cap = q?.points ?? 0
      if (isScorableIndex(t.index)) {
        maxScorePoints += cap
        scorePoints += t.pointsEarned
        if (t.correct) correctCount += 1
      }
      return {
        questionId: t.questionId,
        capacityCodes: [...(q?.competencies ?? [])],
        part: q?.part ?? null,
        score: t.pointsEarned,
        correct: t.correct,
      }
    })
    const capacityBreakdown: Record<string, { earned: number; max: number; percent?: number }> =
      {}
    for (const t of trials) {
      const q = QUESTIONS[t.index]
      if (!q || !isScorableIndex(t.index) || q.competencies.length === 0) continue
      const cap = q.points ?? 0
      for (const code of q.competencies) {
        if (!capacityBreakdown[code]) capacityBreakdown[code] = { earned: 0, max: 0 }
        capacityBreakdown[code].earned += t.pointsEarned
        capacityBreakdown[code].max += cap
      }
    }
    for (const v of Object.values(capacityBreakdown)) {
      v.percent = v.max > 0 ? Math.round((v.earned / v.max) * 10000) / 100 : undefined
    }
    const scorePct =
      maxScorePoints > 0 ? Math.round((scorePoints / maxScorePoints) * 10000) / 100 : 0
    const r: SpaceVolumesResult = {
      id: `space-volumes-${Date.now()}`,
      userName: user?.username,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      trials,
      totalMs: Date.now() - startedAt,
      correctCount,
      score: scorePct,
      scorePoints,
      maxScorePoints,
    }
    saveSpaceVolumesResult(r)
    const geoPayload = buildGeometrySessionMetadataPoints({
      lessonTestId: SPACE_VOLUMES_TEST_ID,
      perQuestion,
      capacityBreakdown,
      totalPercent: scorePct,
    })
    const geometryAnalytics = buildGeometryAnalyticsReport({
      testId: SPACE_VOLUMES_TEST_ID,
      questions: QUESTIONS,
      trials: trials.map((t) => ({
        index: t.index,
        questionId: t.questionId,
        pointsEarned: t.pointsEarned,
        score: t.score,
        correct: t.correct,
      })),
      isScorableIndex,
      scoringMode: 'points',
    })
    persistCompletedTestSessionBestEffort({
      testId: SPACE_VOLUMES_TEST_ID,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalMs: r.totalMs,
      score: r.score,
      correctCount: r.correctCount,
      totalQuestions: QUESTIONS.length,
      trials: r.trials.map((t) => ({
        question_index: t.index,
        question_id: t.questionId,
        selected: t.selected,
        correct: t.correct,
        score: t.score,
        reaction_time_ms: t.reactionTimeMs,
      })),
      metadata: {
        source: 'space-volumes-quiz',
        scorePoints: r.scorePoints,
        maxScorePoints: r.maxScorePoints,
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
      total={QUESTIONS.length}
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
          <Box className="h-4 w-4" /> Géométrie dans l&apos;espace : volumes
        </div>
        <h1 className="mb-3 text-3xl font-bold">Géométrie dans l&apos;espace : volumes</h1>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Trois parties : cours (Q1–Q5), application (Q6–Q10), raisonnement (Q11–Q15).
          Trois choix par question (A, B, C). Barème identique aux autres leçons de
          géométrie.
        </p>
        <CapacityLegend testId={SPACE_VOLUMES_TEST_ID} />
        <p className="mb-4 mt-3 text-xs text-muted-foreground">
          Les capacités Cₖ seront associées dès qu&apos;elles seront communiquées. La
          partie III n&apos;est proposée aux élèves que lorsque photographies et clés
          sont configurées.
        </p>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Passation actuelle : {QUESTIONS.length} question
          {QUESTIONS.length > 1 ? 's' : ''} publiée
          {QUESTIONS.length > 1 ? 's' : ''}.
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
            <strong>1.</strong> Une seule réponse parmi A, B et C, sauf indication
            contraire.
          </li>
          <li>
            <strong>2.</strong> Q6 à Q8 s&apos;appuient sur une figure : les dimensions
            de l&apos;énoncé y figurent.
          </li>
          <li>
            <strong>3.</strong> Validez pour passer à la question suivante. Les bonnes
            réponses ne sont pas affichées pendant la passation.
          </li>
        </ol>
        <Button onClick={onBegin}>
          Démarrer le test <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

function TrialView({
  index,
  total,
  question,
  selectedList,
  isMulti,
  onToggle,
  onSubmit,
}: {
  index: number
  total: number
  question: SpaceVolumesQuestion
  selectedList: number[]
  isMulti: boolean
  onToggle: (idx: number) => void
  onSubmit: () => void
}) {
  const showFigure = Boolean(question.figure || question.imagePath)

  return (
    <main className="container mx-auto max-w-4xl py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Question {index + 1} / {total}
        </h2>
        <div className="text-right">
          <span className="text-sm font-semibold text-indigo-600">{question.id}</span>
          <p className="text-xs text-muted-foreground">
            {question.part === 'course'
              ? 'Partie I — Cours'
              : question.part === 'application'
                ? 'Partie II — Application'
                : 'Partie III — Raisonnement'}
          </p>
          {question.competencies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Compétence : {question.competencies.join(', ')}
            </p>
          )}
        </div>
      </div>
      <Progress value={((index + 1) / total) * 100} className="mb-6" />
      <Card className="p-6">
        <div className={showFigure ? 'grid grid-cols-1 items-start gap-6 md:grid-cols-2' : ''}>
          {showFigure && (
            <SpaceVolumesFigureSlot
              figure={question.figure}
              imagePath={question.imagePath}
              questionId={question.id}
            />
          )}
          <div>
            <div
              className="mb-4 text-base leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderInlineLatex(question.question),
              }}
            />
            {isMulti && (
              <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                Plusieurs réponses possibles.
              </div>
            )}
            <div className="space-y-2">
              {question.options.map((option, idx) => {
                const answerLabel = String.fromCharCode(65 + idx)
                const isSelected = selectedList.includes(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggle(idx)}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </div>
                      <div
                        className="font-semibold"
                        dangerouslySetInnerHTML={{
                          __html: renderInlineLatex(`${answerLabel}. ${option}`),
                        }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
            <Button
              onClick={onSubmit}
              disabled={selectedList.length === 0}
              className="mt-4 w-full"
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

function SpaceVolumesFigureSlot({
  figure,
  imagePath,
  questionId,
}: {
  figure?: SpaceVolumesFigure
  imagePath?: string
  questionId: string
}) {
  if (figure === 'cube-4') return <CubeFourCm />
  if (figure === 'pyramid-6-5') return <PyramidSixFive />
  if (figure === 'cylinder-3-5') return <CylinderThreeFive />
  return <PhotoSlot src={imagePath} questionId={questionId} />
}

function PhotoSlot({ src, questionId }: { src?: string; questionId: string }) {
  const [failed, setFailed] = useState(!src)
  return (
    <div className="rounded-lg border bg-white p-3">
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Photographie ${questionId}`}
          className="mx-auto h-auto w-full max-h-[min(70vh,520px)] object-contain"
          onError={() => setFailed(true)}
        />
      )}
      {(!src || failed) && (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Emplacement photographie {questionId}
          </p>
          <p>
            Déposez le fichier original (sans recadrage inventé) à
            <br />
            <code className="text-xs">{src ?? '(chemin à définir)'}</code>
          </p>
        </div>
      )}
    </div>
  )
}

function CubeFourCm() {
  return (
    <div className="rounded-lg border bg-white p-3">
      <svg viewBox="0 0 280 240" className="mx-auto block w-full max-w-sm">
        <polygon points="70,90 170,90 210,50 110,50" fill="#e0f2fe" stroke="#0f172a" />
        <polygon points="170,90 210,50 210,140 170,180" fill="#bae6fd" stroke="#0f172a" />
        <polygon points="70,90 170,90 170,180 70,180" fill="#f0f9ff" stroke="#0f172a" />
        <text x="100" y="202" fontSize="13" fontWeight={700} fill="#0f172a">
          4 cm
        </text>
        <line x1="70" y1="186" x2="170" y2="186" stroke="#dc2626" strokeWidth="1.5" />
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Cube — toutes les arêtes mesurent 4 cm.
      </p>
    </div>
  )
}

function PyramidSixFive() {
  return (
    <div className="rounded-lg border bg-white p-3">
      <svg viewBox="0 0 280 250" className="mx-auto block w-full max-w-sm">
        <polygon points="60,190 180,190 220,155 100,155" fill="#ecfccb" stroke="#0f172a" />
        <line x1="140" y1="40" x2="60" y2="190" stroke="#0f172a" />
        <line x1="140" y1="40" x2="180" y2="190" stroke="#0f172a" />
        <line x1="140" y1="40" x2="220" y2="155" stroke="#0f172a" />
        <line x1="140" y1="40" x2="100" y2="155" stroke="#0f172a" />
        <line x1="140" y1="40" x2="140" y2="172" stroke="#dc2626" strokeDasharray="4 3" />
        <circle cx="140" cy="172" r="3" fill="#dc2626" />
        <text x="148" y="110" fontSize="13" fontWeight={700} fill="#dc2626">
          h = 5 cm
        </text>
        <text x="88" y="214" fontSize="13" fontWeight={700} fill="#0f172a">
          6 cm
        </text>
        <line x1="60" y1="198" x2="180" y2="198" stroke="#0f172a" />
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Pyramide à base carrée — hauteur perpendiculaire à la base (distincte des
        arêtes latérales).
      </p>
    </div>
  )
}

function CylinderThreeFive() {
  return (
    <div className="rounded-lg border bg-white p-3">
      <svg viewBox="0 0 260 250" className="mx-auto block w-full max-w-sm">
        <ellipse cx="130" cy="55" rx="70" ry="22" fill="#e0f2fe" stroke="#0f172a" />
        <line x1="60" y1="55" x2="60" y2="175" stroke="#0f172a" />
        <line x1="200" y1="55" x2="200" y2="175" stroke="#0f172a" />
        <ellipse cx="130" cy="175" rx="70" ry="22" fill="#bae6fd" stroke="#0f172a" />
        <line x1="130" y1="55" x2="200" y2="55" stroke="#dc2626" />
        <text x="148" y="48" fontSize="13" fontWeight={700} fill="#dc2626">
          r = 3 cm
        </text>
        <line x1="210" y1="55" x2="210" y2="175" stroke="#0f172a" />
        <text x="214" y="120" fontSize="13" fontWeight={700} fill="#0f172a">
          5 cm
        </text>
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Cylindre — rayon de la base (pas le diamètre) et hauteur.
      </p>
    </div>
  )
}

function Results({
  trials,
  onExit,
}: {
  trials: SpaceVolumesTrialResult[]
  onExit: () => void
}) {
  let scorePoints = 0
  let maxScorePoints = 0
  let correctCount = 0
  const perQuestion = trials.map((t) => {
    const q = QUESTIONS[t.index]
    const cap = q?.points ?? 0
    if (isScorableIndex(t.index)) {
      maxScorePoints += cap
      scorePoints += t.pointsEarned
      if (t.correct) correctCount += 1
    }
    return {
      questionId: t.questionId,
      capacityCodes: [...(q?.competencies ?? [])],
      part: q?.part ?? null,
      score: t.pointsEarned,
      correct: t.correct,
    }
  })
  const capacityBreakdown: Record<string, { earned: number; max: number; percent?: number }> =
    {}
  for (const t of trials) {
    const q = QUESTIONS[t.index]
    if (!q || !isScorableIndex(t.index) || q.competencies.length === 0) continue
    const cap = q.points ?? 0
    for (const code of q.competencies) {
      if (!capacityBreakdown[code]) capacityBreakdown[code] = { earned: 0, max: 0 }
      capacityBreakdown[code].earned += t.pointsEarned
      capacityBreakdown[code].max += cap
    }
  }
  const scorePct =
    maxScorePoints > 0 ? Math.round((scorePoints / maxScorePoints) * 10000) / 100 : 0
  const geo = buildGeometrySessionMetadataPoints({
    lessonTestId: SPACE_VOLUMES_TEST_ID,
    perQuestion,
    capacityBreakdown,
    totalPercent: scorePct,
  })
  const geometryAnalytics = buildGeometryAnalyticsReport({
    testId: SPACE_VOLUMES_TEST_ID,
    questions: QUESTIONS,
    trials: trials.map((t) => ({
      index: t.index,
      questionId: t.questionId,
      pointsEarned: t.pointsEarned,
      score: t.score,
      correct: t.correct,
    })),
    isScorableIndex,
    scoringMode: 'points',
  })

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-2 text-3xl font-bold">Test terminé</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Géométrie dans l&apos;espace : volumes
        </p>
        <div className="mb-6 rounded-lg border bg-muted/30 p-6">
          <div className="text-5xl font-bold text-indigo-600">{scorePct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {scorePoints} / {maxScorePoints} pts · {correctCount} / {QUESTIONS.length}{' '}
            entièrement correctes
          </div>
        </div>
        <ul className="mb-6 space-y-1 text-left text-sm">
          {trials.map((t) => {
            const q = QUESTIONS[t.index]
            return (
              <li key={t.questionId} className="flex justify-between rounded border px-3 py-1.5">
                <span>{t.questionId}</span>
                <span className="tabular-nums">
                  {t.pointsEarned} / {q?.points ?? 0} pt
                </span>
              </li>
            )
          })}
        </ul>
        <GeometryAnalyticsSummary report={geometryAnalytics} />
        <CapacityBreakdownCard
          testId={SPACE_VOLUMES_TEST_ID}
          breakdown={geo.capacityBreakdown}
          unit="points"
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
