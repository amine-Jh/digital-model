'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, CheckCircle2, Route } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  TMTNode,
  TMTPart,
  TMTClick,
  TMTPhaseResult,
  TMTResult,
  TMT_TRAINING_COUNT_A,
  TMT_TRAINING_COUNT_B,
  TMT_TEST_COUNT_A,
  TMT_TEST_COUNT_B,
  buildNodes,
  saveTMTResult,
  TRAIL_MAKING_TEST_ID,
} from '@/lib/attentional/trail-making'
import { persistCompletedTestSessionBestEffort } from '@/lib/results/submit-completed-session-api'
import { TestIntroSection } from '@/components/assessment/test-intro-section'

type Phase = 'intro' | 'train-a' | 'test-a' | 'train-b' | 'test-b' | 'done'

export function TrailMakingTest() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('intro')
  const [results, setResults] = useState<TMTPhaseResult[]>([])
  const startedRef = useRef<number>(Date.now())
  const supabaseSynced = useRef(false)

  const finishPhase = (pr: TMTPhaseResult) => {
    setResults((r) => [...r, pr])
    if (phase === 'train-a') setPhase('test-a')
    else if (phase === 'test-a') setPhase('train-b')
    else if (phase === 'train-b') setPhase('test-b')
    else if (phase === 'test-b') setPhase('done')
  }

  useEffect(() => {
    if (phase !== 'done') return
    if (supabaseSynced.current) return
    supabaseSynced.current = true
    const testA = results.find((r) => r.phase === 'test' && r.part === 'A')
    const testB = results.find((r) => r.phase === 'test' && r.part === 'B')
    const errors = results.reduce((s, r) => s + r.errors, 0)
    const r: TMTResult = {
      id: `tmt-${Date.now()}`,
      userName: user?.username,
      startedAt: new Date(startedRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      phases: results,
      testAtime: testA?.totalMs ?? 0,
      testBtime: testB?.totalMs ?? 0,
      switchCost: (testB?.totalMs ?? 0) - (testA?.totalMs ?? 0),
      totalErrors: errors,
      // Simple scoring: 100 - (errors * 5) clamped >= 0
      score: Math.max(0, 100 - errors * 5),
    }
    saveTMTResult(r)
    const phases = r.phases
    persistCompletedTestSessionBestEffort({
      testId: TRAIL_MAKING_TEST_ID,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalMs: Date.now() - startedRef.current,
      score: r.score,
      correctCount: phases.filter((p) => p.errors === 0).length,
      totalQuestions: phases.length,
      trials: phases.map((p, i) => ({
        question_index: i,
        question_id: `tmt-${p.phase}-${p.part}`,
        selected: [p.errors, p.totalMs],
        correct: p.errors === 0,
        score: p.errors === 0 ? 1 : Math.max(0, 1 - p.errors * 0.15),
        reaction_time_ms: p.totalMs,
      })),
      metadata: {
        source: 'trail-making',
        resultId: r.id,
        testAtime: r.testAtime,
        testBtime: r.testBtime,
        switchCost: r.switchCost,
        totalErrors: r.totalErrors,
      },
    })
  }, [phase, results, user])

  if (phase === 'intro')
    return (
      <main className="container mx-auto max-w-3xl py-10">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
        </Button>
        <Card className="p-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-purple-600">
            <Route className="h-4 w-4" /> Attention visuo-spatiale
          </div>
          <h1 className="mb-3 text-3xl font-bold">Trail Making Test</h1>
          <div className="mb-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Le Trail Making Test (TMT) est une évaluation neuropsychologique largement utilisée pour
              mesurer les fonctions exécutives, notamment chez les patients ayant subi un AVC ou
              présentant des troubles cognitifs.
            </p>
            <p>L&apos;exécution correcte du TMT mobilise plusieurs capacités mentales essentielles, notamment :</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>la reconnaissance des chiffres et des lettres ;</li>
              <li>la flexibilité mentale ;</li>
              <li>le balayage visuel ;</li>
              <li>l&apos;attention visuo-spatiale ;</li>
              <li>les fonctions visuo-motrices ;</li>
              <li>et la vitesse de traitement cognitif.</li>
            </ul>
            <p>
              La performance est évaluée à travers deux conditions différentes de traitement visuel et
              de balayage visuo-moteur :
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Partie A : relier les nombres de 1 à 25 dans l&apos;ordre croissant ;</li>
              <li>
                Partie B : relier alternativement les nombres et les lettres dans l&apos;ordre croissant.
              </li>
            </ul>
            <p className="text-xs">
              Chaque partie commence par un entraînement, puis un test chronométré.
            </p>
          </div>

          <div className="mb-6">
            <TestIntroSection testId={TRAIL_MAKING_TEST_ID} />
          </div>

          <Button onClick={() => { startedRef.current = Date.now(); setPhase('train-a') }}>
            Commencer <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </main>
    )

  if (phase === 'done') {
    const testA = results.find((r) => r.phase === 'test' && r.part === 'A')
    const testB = results.find((r) => r.phase === 'test' && r.part === 'B')
    const errors = results.reduce((s, r) => s + r.errors, 0)
    const switchCost = (testB?.totalMs ?? 0) - (testA?.totalMs ?? 0)
    return (
      <main className="container mx-auto max-w-2xl py-10">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <h1 className="mb-6 text-2xl font-bold">Test terminé</h1>
          <div className="grid grid-cols-2 gap-3 text-left">
            <Stat label="Temps Partie A" value={fmtMs(testA?.totalMs ?? 0)} />
            <Stat label="Temps Partie B" value={fmtMs(testB?.totalMs ?? 0)} />
            <Stat label="Erreurs totales" value={String(errors)} />
            <Stat label="Flexibilité (B − A)" value={fmtMs(switchCost)} />
          </div>
          <Button className="mt-6" onClick={() => router.push('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </Card>
      </main>
    )
  }

  const part: TMTPart = phase === 'train-a' || phase === 'test-a' ? 'A' : 'B'
  const isTraining = phase === 'train-a' || phase === 'train-b'
  const count = isTraining
    ? part === 'A'
      ? TMT_TRAINING_COUNT_A
      : TMT_TRAINING_COUNT_B
    : part === 'A'
    ? TMT_TEST_COUNT_A
    : TMT_TEST_COUNT_B

  return (
    <TMTBoardPhase
      key={phase}
      part={part}
      isTraining={isTraining}
      count={count}
      onDone={(pr) => finishPhase(pr)}
    />
  )
}

function TMTBoardPhase({
  part,
  isTraining,
  count,
  onDone,
}: {
  part: TMTPart
  isTraining: boolean
  count: number
  onDone: (pr: TMTPhaseResult) => void
}) {
  const nodes = useMemo(() => buildNodes(part, count), [part, count])
  const [clicked, setClicked] = useState<string[]>([])
  const [errors, setErrors] = useState(0)
  const [clicks, setClicks] = useState<TMTClick[]>([])
  const [wrongId, setWrongId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const onStartTimer = () => setStartedAt(Date.now())

  const expectedIndex = clicked.length

  const handleClick = useCallback(
    (node: TMTNode) => {
      if (!startedAt) return
      if (clicked.includes(node.id)) return
      const expected = nodes[expectedIndex]
      if (node.id === expected.id) {
        const now = Date.now() - startedAt
        setClicked((c) => [...c, node.id])
        setClicks((c) => [...c, { nodeId: node.id, label: node.label, correct: true, timeMs: now }])
        if (expectedIndex + 1 >= nodes.length) {
          // done
          const total = Date.now() - startedAt
          onDone({
            phase: isTraining ? 'training' : 'test',
            part,
            totalMs: total,
            errors,
            clicks: [...clicks, { nodeId: node.id, label: node.label, correct: true, timeMs: now }],
            nodes,
          })
        }
      } else {
        setErrors((e) => e + 1)
        const now = Date.now() - startedAt
        setClicks((c) => [...c, { nodeId: node.id, label: node.label, correct: false, timeMs: now }])
        setWrongId(node.id)
        setTimeout(() => setWrongId(null), 400)
      }
    },
    [clicked, clicks, expectedIndex, errors, isTraining, nodes, onDone, part, startedAt],
  )

  const target = nodes[expectedIndex]

  return (
    <main className="container mx-auto max-w-5xl py-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {isTraining ? 'Entraînement' : 'Test'} · Partie {part}
          </h1>
          <p className="text-xs text-muted-foreground">
            {part === 'A'
              ? 'Reliez les chiffres dans l’ordre (1 → 2 → …)'
              : 'Alternez chiffres et lettres (1 → A → 2 → B → …)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Cliqués : {clicked.length}/{nodes.length}</Badge>
          <Badge variant="outline">Erreurs : {errors}</Badge>
          {!startedAt && (
            <Button size="sm" onClick={onStartTimer}>
              Démarrer
            </Button>
          )}
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          className="h-[600px] w-full bg-slate-50"
        >
          {/* Lines between successive correct clicks */}
          {clicked.slice(1).map((id, i) => {
            const a = nodes.find((n) => n.id === clicked[i])!
            const b = nodes.find((n) => n.id === id)!
            return (
              <line
                key={`${id}-${i}`}
                x1={a.x * 1000}
                y1={a.y * 600}
                x2={b.x * 1000}
                y2={b.y * 600}
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )
          })}
          {nodes.map((n) => {
            const isClicked = clicked.includes(n.id)
            const isTarget = isTraining && target && n.id === target.id
            const isWrong = wrongId === n.id
            const fill = isClicked
              ? '#22c55e'
              : isWrong
              ? '#ef4444'
              : isTarget
              ? '#fde68a'
              : '#ffffff'
            const stroke = isClicked ? '#166534' : isWrong ? '#991b1b' : '#334155'
            return (
              <g
                key={n.id}
                onClick={() => handleClick(n)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={n.x * 1000} cy={n.y * 600} r={26} fill={fill} stroke={stroke} strokeWidth={2} />
                <text
                  x={n.x * 1000}
                  y={n.y * 600 + 6}
                  textAnchor="middle"
                  fontSize={18}
                  fontWeight="bold"
                  fill={isClicked ? '#ffffff' : '#0f172a'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </Card>
      {isTraining && (
        <p className="mt-3 text-xs text-muted-foreground">
          💡 La cible actuelle est surlignée en jaune pendant l’entraînement.
        </p>
      )}
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

function fmtMs(ms: number): string {
  if (ms <= 0) return '—'
  const s = Math.floor(ms / 1000)
  const msR = ms % 1000
  return `${s}s ${msR}ms`
}
