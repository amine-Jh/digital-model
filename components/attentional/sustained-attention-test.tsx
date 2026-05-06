'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  SART_DIGIT_MS,
  SART_ISI_MS,
  SART_TRIAL_COUNT,
  SARTTrial,
  SARTTrialResult,
  SARTResult,
  buildSARTTrials,
  saveSARTResult,
  SUSTAINED_ATTENTION_TEST_ID,
} from '@/lib/attentional/sustained-attention'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { TestIntroSection } from '@/components/assessment/test-intro-section'

type Phase = 'intro' | 'instructions' | 'fixation' | 'stimulus' | 'isi' | 'done'

export function SustainedAttentionTest() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [trials, setTrials] = useState<SARTTrial[]>([])
  const [current, setCurrent] = useState(0)
  const [responses, setResponses] = useState<SARTTrialResult[]>([])
  const [startedAt, setStartedAt] = useState<number>(0)
  const trialStart = useRef(0)
  const pressed = useRef(false)
  const reactionMs = useRef<number | null>(null)
  const supabaseSynced = useRef(false)

  const begin = () => {
    supabaseSynced.current = false
    setTrials(buildSARTTrials())
    setCurrent(0)
    setResponses([])
    setStartedAt(Date.now())
    setPhase('fixation')
  }

  const finishTrial = useCallback(() => {
    const trial = trials[current]
    if (!trial) return
    const correct = trial.isNoGo ? !pressed.current : pressed.current
    const res: SARTTrialResult = {
      ...trial,
      pressed: pressed.current,
      reactionTimeMs: reactionMs.current,
      correct,
    }
    setResponses((r) => [...r, res])
    pressed.current = false
    reactionMs.current = null
    if (current + 1 >= trials.length) {
      setPhase('done')
    } else {
      setCurrent((n) => n + 1)
      setPhase('isi')
    }
  }, [current, trials])

  // fixation → stimulus
  useEffect(() => {
    if (phase !== 'fixation') return
    const t = setTimeout(() => setPhase('stimulus'), 500)
    return () => clearTimeout(t)
  }, [phase])

  // ISI → stimulus (next trial)
  useEffect(() => {
    if (phase !== 'isi') return
    const t = setTimeout(() => setPhase('stimulus'), SART_ISI_MS)
    return () => clearTimeout(t)
  }, [phase])

  // stimulus lifecycle
  useEffect(() => {
    if (phase !== 'stimulus') return
    trialStart.current = Date.now()
    const t = setTimeout(finishTrial, SART_DIGIT_MS)
    return () => clearTimeout(t)
  }, [phase, finishTrial])

  // keypress
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'stimulus' && !pressed.current) {
        pressed.current = true
        reactionMs.current = Date.now() - trialStart.current
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  // save
  useEffect(() => {
    if (phase !== 'done' || responses.length === 0) return
    if (supabaseSynced.current) return
    supabaseSynced.current = true
    const correctCount = responses.filter((r) => r.correct).length
    const commission = responses.filter((r) => r.isNoGo && r.pressed).length
    const omission = responses.filter((r) => !r.isNoGo && !r.pressed).length
    const rts = responses.filter((r) => !r.isNoGo && r.pressed && r.reactionTimeMs != null).map((r) => r.reactionTimeMs!)
    const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0
    const r: SARTResult = {
      id: `sart-${Date.now()}`,
      userName: user?.username,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      trials: responses,
      totalMs: Date.now() - startedAt,
      correctCount,
      commissionErrors: commission,
      omissionErrors: omission,
      meanRT,
      score: Math.round((correctCount / responses.length) * 100),
    }
    saveSARTResult(r)
    persistCompletedTestSessionBestEffort({
      testId: SUSTAINED_ATTENTION_TEST_ID,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalMs: r.totalMs,
      score: r.score,
      correctCount: r.correctCount,
      totalQuestions: SART_TRIAL_COUNT,
      trials: r.trials.map((t, i) => ({
        question_index: i,
        question_id: `sart-${t.index}`,
        selected: [t.digit, t.isNoGo, t.pressed],
        correct: t.correct,
        score: t.correct ? 1 : 0,
        reaction_time_ms: t.reactionTimeMs,
      })),
      metadata: {
        source: 'sustained-attention',
        resultId: r.id,
        commissionErrors: r.commissionErrors,
        omissionErrors: r.omissionErrors,
        meanRT: r.meanRT,
      },
    })
  }, [phase, responses, startedAt, user])

  if (phase === 'intro') return <Intro onNext={() => setPhase('instructions')} onQuit={() => router.push('/dashboard')} />
  if (phase === 'instructions') return <Instructions onStart={begin} onBack={() => setPhase('intro')} />
  if (phase === 'done') return <Results responses={responses} onExit={() => router.push('/dashboard')} />

  return (
    <StimulusView
      phase={phase}
      trial={trials[current]}
      index={current}
      total={trials.length}
    />
  )
}

function Intro({ onNext, onQuit }: { onNext: () => void; onQuit: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button variant="ghost" size="sm" onClick={onQuit} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
      </Button>
      <Card className="p-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600">
          <Clock className="h-4 w-4" /> Attention soutenue
        </div>
        <h1 className="mb-3 text-3xl font-bold">Sustained Attention to Response Task (SART)</h1>
        <div className="mb-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Le SART (Sustained Attention to Response Test) a été conçu par Robertson et ses collègues
            en 1997 (Robertson, Andrade, Baddeley et Yiend) et a ensuite été utilisé dans plusieurs
            études scientifiques consacrées à l&apos;attention soutenue.
          </p>
          <p>
            Robertson, Manly, Andrade, Baddeley et Yiend (1997) ont développé une nouvelle tâche de
            performance continue (Continuous Performance Task – CPT), appelée SART. Cette tâche implique
            une réponse motrice à des stimuli fréquents et l&apos;inhibition d&apos;une réponse motrice
            face à un stimulus rare.
          </p>
          <p>
            Les chercheurs ont supposé que le SART constituerait une meilleure mesure de l&apos;attention
            soutenue, car il est moins vulnérable que les tâches classiques de vigilance aux réponses
            devenant rapidement automatiques plutôt que contrôlées.
          </p>
          <p>
            Le SART s&apos;est effectivement révélé sensible à la capacité de maintenir l&apos;attention dans
            des tâches monotones mais exigeantes (Robertson et al., 1997).
          </p>
        </div>

        <div className="mt-2">
          <TestIntroSection testId={SUSTAINED_ATTENTION_TEST_ID} />
        </div>

        <Button className="mt-6" onClick={onNext}>
          Suivant <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

function Instructions({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl py-10">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <Card className="p-8">
        <h2 className="mb-3 text-2xl font-bold">Consignes</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Un point de fixation (+) apparaît puis des chiffres de 1 à 9 se succèdent au centre de
          l’écran. Chaque chiffre reste affiché 1 seconde.
        </p>
        <ul className="mb-6 ml-6 list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            Appuyez sur <kbd className="rounded bg-muted px-1.5 py-0.5">Espace</kbd> dès qu’un
            chiffre apparaît…
          </li>
          <li>
            … <strong>sauf quand le chiffre est 3</strong> : vous ne devez appuyer sur aucune
            touche.
          </li>
        </ul>
        <div className="mb-6 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          20 essais · ~30 secondes.
        </div>
        <Button onClick={onStart}>
          Commencer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Card>
    </main>
  )
}

function StimulusView({
  phase,
  trial,
  index,
  total,
}: {
  phase: Phase
  trial: SARTTrial | undefined
  index: number
  total: number
}) {
  return (
    <main className="container mx-auto max-w-4xl py-8">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Essai {index + 1} / {total}
        </span>
        <span>
          Espace pour tous les chiffres <strong>sauf le 3</strong>
        </span>
      </div>
      <Progress value={(index / total) * 100} className="mb-6" />
      <Card className="flex items-center justify-center p-16">
        <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-slate-900">
          {phase === 'fixation' || phase === 'isi' ? (
            <span className="text-6xl text-white">+</span>
          ) : phase === 'stimulus' && trial ? (
            <span className="text-8xl font-bold text-white">{trial.digit}</span>
          ) : null}
        </div>
      </Card>
    </main>
  )
}

function Results({ responses, onExit }: { responses: SARTTrialResult[]; onExit: () => void }) {
  const correct = responses.filter((r) => r.correct).length
  const commission = responses.filter((r) => r.isNoGo && r.pressed).length
  const omission = responses.filter((r) => !r.isNoGo && !r.pressed).length
  const rts = responses.filter((r) => !r.isNoGo && r.pressed && r.reactionTimeMs != null).map((r) => r.reactionTimeMs!)
  const meanRT = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0
  return (
    <main className="container mx-auto max-w-2xl py-10">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="mb-6 text-2xl font-bold">Test terminé</h1>
        <div className="grid grid-cols-2 gap-3 text-left">
          <Stat label="Score" value={`${correct} / ${responses.length}`} />
          <Stat label="Pourcentage" value={`${Math.round((correct / responses.length) * 100)}%`} />
          <Stat label="Commissions (pressé sur 3)" value={String(commission)} />
          <Stat label="Omissions (non pressé)" value={String(omission)} />
          <Stat label="Temps de réaction moyen" value={`${meanRT} ms`} />
        </div>
        <Button className="mt-6" onClick={onExit}>
          Retour au tableau de bord
        </Button>
      </Card>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
