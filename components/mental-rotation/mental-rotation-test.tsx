'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  rotationQuestions,
  computeRotationResult,
  OPTIONS,
  MENTAL_ROTATION_STORAGE_KEY,
  MENTAL_ROTATION_DURATION_SECONDS,
  MENTAL_ROTATION_TEST_ID,
  type OptionLetter,
  type RotationResult,
} from '@/lib/mental-rotation-test'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { TestIntroSection } from '@/components/assessment/test-intro-section'
import { Brain, Clock, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react'

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(totalSeconds: number, active: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active) return
    if (remaining <= 0) {
      if (!firedRef.current) { firedRef.current = true; onExpire() }
      return
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(id)
  }, [active, remaining, onExpire])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return { remaining, display: `${mm}:${ss}` }
}

// ─── Image with fallback ──────────────────────────────────────────────────────
function RotationImage({ src, questionNumber }: { src: string; questionNumber: number }) {
  const [error, setError] = useState(false)
  if (error) {
    return (
      <div className="w-full aspect-video max-w-xl mx-auto rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-2">
        <Brain className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          rotation ({questionNumber}).jpg
        </p>
        <p className="text-xs text-muted-foreground/60">Déposez l&apos;image dans <code className="bg-muted px-1 rounded">public/rotation/</code></p>
      </div>
    )
  }
  return (
    <div className="relative w-full aspect-video max-w-xl mx-auto rounded-2xl overflow-hidden border border-border bg-white shadow-md">
      <Image
        src={src}
        alt={`Question ${questionNumber}`}
        fill
        className="object-contain p-3"
        onError={() => setError(true)}
        priority
      />
    </div>
  )
}

// ─── Introduction page ────────────────────────────────────────────────────────
function IntroScreen({ onBegin }: { onBegin: () => void }) {
  const [showRefs, setShowRefs] = useState(false)

  const references = [
    'Arrighi, L., & Hausmann, M. (2022). L\'anxiété spatiale et la confiance en soi médiatisent les différences de sexe/genre dans la rotation mentale. Learning & Memory, 29(9), 312-320.',
    'Cheung, C. N., Sung, J. Y., & Lourenco, S. F. (2020). L\'entraînement à la rotation mentale se traduit-il par des gains en compétence mathématique ? Psychological Research, 84(7), 2000-2017.',
    'Collins, D. W., & Kimura, D. (1997). Une grande différence de sexe sur une tâche de rotation mentale bidimensionnelle. Behavioral neuroscience, 111(4), 845.',
    'Feldman, J. S., & Huang-Pollock, C. (2021). Une nouvelle approche de la cognition spatiale dans le TDAH. Journal of the international neuropsychological society, 27(5), 472-483.',
    'Jones, H. G., et al. (2021). L\'effet de la latéralité sur la rotation mentale des mains : une revue systématique. Psychological Research, 85, 2829-2881.',
    'Kaltner, S., & Jansen, P. (2014). Rotation mentale et performance motrice chez les enfants avec dyslexie développementale. Research in developmental disabilities, 35(3), 741-754.',
    'Kubicek, E., & Quandt, L. C. (2021). Une relation positive entre la compréhension de la langue des signes et les capacités de rotation mentale. The Journal of Deaf Studies, 26(1), 1-12.',
    'Krüger, M. (2018). Les enfants de trois ans résolvent une tâche de rotation mentale au-dessus du niveau de chance. Frontiers in Psychology, 9, 328248.',
    'Otenen, E., & Kanero, J. (2022). Localiser le passé et le futur : l\'influence de la capacité spatiale sur la représentation temporelle. CogSci Proceedings, Vol. 44.',
    'Razzaque, J., et al. (2024). Aborder la pathophysiologie des déficits de la Tâche de Rotation Mentale dans la maladie de Parkinson. Neurology, Vol. 102, No.17.',
    'Shepard, R. N., & Metzler, J. (1971). Rotation mentale d\'objets tridimensionnels. Science, 171(3972), 701-703.',
    'Suzuki, A., et al. (2018). Établissement d\'un nouveau système de dépistage pour les troubles cognitifs légers. Journal of Alzheimer\'s disease, 61(4), 1653-1665.',
    'Thérien, V. D., et al. (2022). Corrélats neuronaux différenciés sous-jacents aux processus de rotation mentale dans l\'autisme. NeuroImage: Clinical, 36, 103221.',
    'Titze, C., Heil, M., & Jansen, P. (2008). Les différences de genre dans le Test de Rotations Mentales ne sont pas dues à la complexité de la tâche. Journal of Individual Differences, 29(3), 130-133.',
    'Vandenberg, S. G., & Kuse, A. R. (1978). Rotations mentales, un test de groupe de visualisation spatiale tridimensionnelle. Perceptual and motor skills, 47(2), 599-604.',
    'Weigelt, M., & Memmert, D. (2021). La capacité de rotation mentale des joueurs de basketball experts. Research Quarterly for Exercise and Sport, 92(1), 137-145.',
    'Zell, E., Krizan, Z., & Teeter, S. R. (2015). Évaluation des similarités et différences de genre en utilisant la méta-synthèse. American psychologist, 70(1), 10.',
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            3D Mental Rotation Test
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Mental Rotation Test (Vandenberg &amp; Kuse, 1978)
          </p>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Le Test de Rotation Mentale est une tâche puissante dans le domaine de la psychologie
            cognitive pour étudier le traitement spatial.
          </p>
          <p>
            Le test de rotation mentale remonte aux années 1970 quand il a été développé pour
            étudier les capacités des individus à faire pivoter mentalement des objets. En 1971,
            <strong className="text-foreground"> Roger Shepard et Jacqueline Metzler</strong> ont
            été parmi les premiers à étudier objectivement la rotation mentale en présentant
            plusieurs paires d'objets 3D, cubiques, ou asymétriquement alignés et en mesurant
            ensuite le temps de réaction lorsque les participants déterminaient si les objets
            appariés étaient identiques.
          </p>
          <p>
            En 1978, <strong className="text-foreground">Steven G. Vandenberg et Allan R. Kuse
            </strong> ont formalisé le Test de Rotations Mentales basé sur la tâche de Shepard et
            Metzler, en présentant des objets 3D à différentes orientations faisant pivoter autour
            d'un axe vertical. Il s'agissait d'un test de 20 éléments où le participant devait
            comparer quatre figures et sélectionner deux choix correspondant à la figure critère.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center pt-1">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">20</p>
              <p className="text-xs">questions</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">20 min</p>
              <p className="text-xs">durée</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-lg font-bold text-foreground">40 pts</p>
              <p className="text-xs">score max</p>
            </div>
          </div>

          {/* Instructions box */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-foreground">
            <p className="font-semibold text-primary mb-2">Instructions</p>
            <ul className="space-y-1.5 text-sm">
              <li>• Chaque question présente une figure 3D de référence.</li>
              <li>• Sélectionnez les <strong>DEUX</strong> réponses correctes parmi A, B, C, D.</li>
              <li>• Utilisez les cases à cocher — deux sélections maximum.</li>
              <li>• Vous ne pouvez pas revenir en arrière.</li>
              <li>• Le test se soumet automatiquement à la fin des 20 minutes.</li>
            </ul>
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-xs font-medium">
              Barème : +2 pts (les deux bonnes) · +1 pt (une bonne) · 0 pt (aucune bonne)
            </div>
          </div>

          {/* References toggle */}
          <button
            onClick={() => setShowRefs(!showRefs)}
            className="text-xs text-primary underline underline-offset-2"
          >
            {showRefs ? 'Masquer les références' : 'Afficher les références (17)'}
          </button>
          {showRefs && (
            <ol className="text-xs space-y-1.5 list-decimal list-inside text-muted-foreground/80 max-h-48 overflow-y-auto pr-1">
              {references.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ol>
          )}
        </div>

        <TestIntroSection testId={MENTAL_ROTATION_TEST_ID} />

        <Button className="w-full h-12 text-base font-semibold" onClick={onBegin}>
          Commencer le test
        </Button>
      </div>
    </div>
  )
}

// ─── Score screen ─────────────────────────────────────────────────────────────
function ScoreScreen({ result }: { result: RotationResult }) {
  const router = useRouter()
  const pct = Math.round((result.totalScore / result.maxScore) * 100)
  const color =
    pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-600'
  const mm = String(Math.floor(result.timeUsedSeconds / 60)).padStart(2, '0')
  const ss = String(result.timeUsedSeconds % 60).padStart(2, '0')

  const fullMark = result.responses.filter((r) => r.score === 1).length
  const zeroMark = result.responses.filter((r) => r.score === 0).length

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Test terminé !</h1>
          <p className="text-sm text-muted-foreground">3D Mental Rotation Test (Vandenberg &amp; Kuse)</p>
        </div>

        {/* Main score */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
          <p className={`text-6xl font-bold tabular-nums ${color}`}>
            {result.totalScore}
            <span className="text-2xl text-muted-foreground">/{result.maxScore}</span>
          </p>
          <p className={`text-lg font-semibold ${color}`}>{pct}% de réussite</p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-2xl font-bold text-green-700">{fullMark}</p>
            <p className="text-xs text-green-600">+1 pt (2 bonnes réponses)</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-2xl font-bold text-red-700">{zeroMark}</p>
            <p className="text-xs text-red-600">0 pt</p>
          </div>
        </div>

        {/* Per-question table */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 max-h-64 overflow-y-auto">
          <p className="text-sm font-semibold mb-2">Détail par question</p>
          {result.responses.map((r) => (
            <div
              key={r.questionNumber}
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                r.score === 1
                  ? 'bg-green-50 border border-green-100'
                  : 'bg-red-50 border border-red-100'
              }`}
            >
              <span className="font-medium">Q{r.questionNumber}</span>
              <span className="text-muted-foreground">
                {r.selected.length > 0 ? r.selected.join(', ') : '—'}
              </span>
              <span className={`font-bold ${r.score === 1 ? 'text-green-600' : 'text-red-500'}`}>
                +{r.score} pt
              </span>
            </div>
          ))}
        </div>

        {/* Time */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Temps utilisé : {mm}:{ss}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => router.push('/results')}>
            Mes résultats
          </Button>
          <Button onClick={() => router.push('/tests')}>
            Retour aux tests
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main test ────────────────────────────────────────────────────────────────
export function MentalRotationTest() {
  const total = rotationQuestions.length
  const [phase, setPhase] = useState<'intro' | 'test' | 'done'>('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  // answers: questionNumber → selected letters
  const [answers, setAnswers] = useState<Record<number, OptionLetter[]>>({})
  // response times in ms per question
  const [timings, setTimings] = useState<Record<number, number>>({})
  const [startTime, setStartTime] = useState(0)
  const [result, setResult] = useState<RotationResult | null>(null)
  const questionStartRef = useRef<number>(Date.now())

  const submit = useCallback((ans: Record<number, OptionLetter[]>, elapsedSeconds: number) => {
    const raw = rotationQuestions.map((q) => ({
      questionNumber: q.number,
      selected: ans[q.number] ?? [],
      responseTimeMs: timings[q.number] ?? 0,
    }))
    const r = computeRotationResult(raw, elapsedSeconds)
    sessionStorage.setItem(MENTAL_ROTATION_STORAGE_KEY, JSON.stringify(r))
    const trials = r.responses.map((resp, i) => ({
      question_index: i,
      question_id: `mr3d-${resp.questionNumber}`,
      selected: [...resp.selected],
      correct: resp.score === 1,
      score: resp.score,
      reaction_time_ms: resp.responseTimeMs,
    }))
    persistCompletedTestSessionBestEffort({
      testId: MENTAL_ROTATION_TEST_ID,
      completedAt: r.completedAt,
      totalMs: elapsedSeconds * 1000,
      score: Math.round((r.totalScore / r.maxScore) * 100),
      correctCount: r.responses.filter((x) => x.score === 1).length,
      totalQuestions: r.responses.length,
      trials,
      metadata: { source: 'mental-rotation-3d', totalScoreRaw: r.totalScore },
    })
    setResult(r)
    setPhase('done')
  }, [timings])

  const handleExpire = useCallback(() => {
    const elapsed = MENTAL_ROTATION_DURATION_SECONDS
    submit(answers, elapsed)
  }, [answers, submit])

  const { remaining, display: timeDisplay } = useCountdown(
    MENTAL_ROTATION_DURATION_SECONDS,
    phase === 'test',
    handleExpire
  )

  // Reset per-question timer on navigation
  useEffect(() => {
    questionStartRef.current = Date.now()
  }, [currentIndex])

  function handleBegin() {
    setStartTime(Date.now())
    setPhase('test')
  }

  function recordTime(qNumber: number) {
    const elapsed = Date.now() - questionStartRef.current
    setTimings((prev) => ({ ...prev, [qNumber]: (prev[qNumber] ?? 0) + elapsed }))
  }

  const q = rotationQuestions[currentIndex]!
  const isLast = currentIndex === total - 1
  const selected = answers[q.number] ?? []
  const isUrgent = remaining <= 300

  function toggleOption(letter: OptionLetter) {
    setAnswers((prev) => {
      const cur = prev[q.number] ?? []
      if (cur.includes(letter)) {
        return { ...prev, [q.number]: cur.filter((l) => l !== letter) }
      }
      if (cur.length >= 2) return prev   // max 2 selections
      return { ...prev, [q.number]: [...cur, letter] }
    })
  }

  function handleNext() {
    recordTime(q.number)
    setCurrentIndex((i) => i + 1)
  }

  function handleSubmit() {
    recordTime(q.number)
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    submit(answers, elapsed)
  }

  if (phase === 'intro') return <IntroScreen onBegin={handleBegin} />
  if (phase === 'done' && result) return <ScoreScreen result={result} />

  const progress = ((currentIndex + 1) / total) * 100

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Rotation Mentale 3D</span>
          </div>

          {/* Countdown */}
          <div className={`flex items-center gap-1.5 font-mono font-bold text-sm tabular-nums px-3 py-1 rounded-lg border ${
            isUrgent
              ? 'text-red-600 border-red-200 bg-red-50 animate-pulse'
              : 'text-foreground border-border bg-muted/30'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {timeDisplay}
          </div>

          <Badge variant="outline" className="text-xs">
            {currentIndex + 1} / {total}
          </Badge>
        </div>
        <div className="max-w-2xl mx-auto mt-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-2xl space-y-6">

          {/* Question number */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Question <span className="text-primary font-bold">{q.number}</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              Sélectionnez <strong>2</strong> réponses · {selected.length}/2 sélectionnée(s)
            </span>
          </div>

          {/* 3D Image */}
          <RotationImage src={q.imagePath} questionNumber={q.number} />

          {/* Instruction reminder */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 text-center text-sm text-primary font-medium">
            Quelle(s) figure(s) est (sont) identique(s) à la figure de référence ?
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.map((letter) => {
              const isChecked = selected.includes(letter)
              const isDisabled = !isChecked && selected.length >= 2
              return (
                <button
                  key={letter}
                  onClick={() => !isDisabled && toggleOption(letter)}
                  disabled={isDisabled}
                  className={[
                    'flex items-center gap-3 rounded-xl border-2 px-5 py-4 transition-all duration-150 text-left',
                    isChecked
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : isDisabled
                        ? 'border-border bg-muted/20 opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer',
                  ].join(' ')}
                >
                  {/* Checkbox visual */}
                  <span className={[
                    'flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all',
                    isChecked
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40 bg-background',
                  ].join(' ')}>
                    {isChecked && (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  {/* Letter badge */}
                  <span className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isChecked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  ].join(' ')}>
                    {letter}
                  </span>

                  <span className={`text-base font-semibold ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                    Option {letter}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Urgent warning */}
          {isUrgent && (
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Moins de 5 minutes restantes !
            </div>
          )}

          {/* Navigation — Next only (no back) */}
          <div className="flex justify-end pb-8">
            {isLast ? (
              <Button
                onClick={handleSubmit}
                disabled={selected.length !== 2}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8"
              >
                <CheckCircle className="w-4 h-4" />
                Soumettre le test
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={selected.length !== 2}
                className="flex items-center gap-2 px-8"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* No-back notice */}
          <p className="text-center text-xs text-muted-foreground pb-2">
            Navigation uniquement vers l'avant · Pas de retour possible
          </p>
        </div>
      </div>
    </div>
  )
}
