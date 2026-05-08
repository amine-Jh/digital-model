'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Lock, Pencil, CheckCircle2, ImageOff, ArrowLeft } from 'lucide-react'
import { DrawingCanvas } from '@/components/beery-vmi/drawing-canvas'
import { useAuth } from '@/lib/auth-context'
import {
  BEERY_MOTRICE_ITEM_COUNT,
  motriceImagePath,
  startNewSession,
  saveDrawing,
  submitSession,
  getCurrentSessionId,
  getSession,
  BeeryMotriceSession,
  clearCurrentSessionId,
} from '@/lib/beery-motrice'
import { submitCompletedTestSession } from '@/lib/results/submit-completed-session-api'
import { TestIntroSection } from '@/components/assessment/test-intro-section'

const BEERY_VMI_TEST_ID_LOCAL = 'test-visuo-motor'

export function BeeryMotriceTest() {
  const router = useRouter()
  const { user } = useAuth()
  const [session, setSession] = useState<BeeryMotriceSession | null>(null)
  const [currentItem, setCurrentItem] = useState(1)
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [introAccepted, setIntroAccepted] = useState(false)

  // Init or resume session
  useEffect(() => {
    const existingId = getCurrentSessionId()
    if (existingId) {
      const s = getSession(existingId)
      if (s && s.status === 'in-progress') {
        setSession(s)
        setCurrentItem(Math.min(BEERY_MOTRICE_ITEM_COUNT, s.drawings.length + 1))
        return
      }
    }
    const newSess = startNewSession(user?.username ?? 'Anonyme', user?.username)
    setSession(newSess)
    setCurrentItem(1)
  }, [user])

  const progressPct = ((currentItem - 1) / BEERY_MOTRICE_ITEM_COUNT) * 100

  if (submitted) {
    return (
      <div className="container mx-auto max-w-xl py-16">
        <Card className="p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h1 className="mb-2 text-2xl font-bold">Test terminé</h1>
          <p className="text-muted-foreground">
            Vos dessins ont été enregistrés. Un correcteur validera votre score ; vous le verrez
            apparaître dans votre profil une fois validé.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Retour au tableau de bord
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!session) return null

  // First screen: introduction + references gate
  if (!introAccepted) {
    return (
      <div className="container mx-auto max-w-2xl py-10 space-y-6">
        <Card className="p-8">
          <h1 className="mb-2 text-2xl font-bold">Beery VMI — Intégration visuo-motrice</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Veuillez prendre connaissance de l&apos;introduction avant de commencer.
          </p>
          <TestIntroSection testId={BEERY_VMI_TEST_ID_LOCAL} />
          <Button
            className="mt-6 w-full h-11"
            onClick={() => setIntroAccepted(true)}
          >
            J&apos;ai lu — commencer le test
          </Button>
        </Card>
      </div>
    )
  }

  const isLast = currentItem === BEERY_MOTRICE_ITEM_COUNT

  const handleNext = () => {
    if (!drawingUrl) return
    saveDrawing(session.id, currentItem, drawingUrl)
    if (isLast) {
      submitSession(session.id)
      clearCurrentSessionId()
      const completed = getSession(session.id)
      if (user?.userId && completed) {
        void submitCompletedTestSession({
          testId: BEERY_VMI_TEST_ID_LOCAL,
          startedAt: completed.startedAt,
          completedAt: completed.completedAt ?? new Date().toISOString(),
          totalMs: null,
          score: 0,
          correctCount: 0,
          totalQuestions: BEERY_MOTRICE_ITEM_COUNT,
          trials: [],
          pendingAdminValidation: true,
          metadata: {
            source: 'beery-motrice',
            localSessionId: completed.id,
          },
        })
      }
      setSubmitted(true)
      return
    }
    setCurrentItem((n) => n + 1)
    setDrawingUrl(null)
  }

  return (
    <div className="container mx-auto max-w-6xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> pas de retour</Badge>
          <Badge className="gap-1"><Pencil className="h-3 w-3" /> stylo fluide</Badge>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Beery VMI — Intégration visuo-motrice</h1>
        <p className="text-sm text-muted-foreground">
          Reproduisez la figure ci-dessous aussi fidèlement que possible. Pas de gomme, pas de retour
          en arrière — cliquez sur « Suivant » pour valider votre dessin.
        </p>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Item {currentItem} / {BEERY_MOTRICE_ITEM_COUNT}
          </span>
          <span>{Math.round(progressPct)} %</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Figure à reproduire
          </h2>
          <StimulusImage item={currentItem} />
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            motrice_{currentItem}.jpg
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Votre dessin</h2>
          <DrawingCanvas
            key={currentItem}
            tool="pencil"
            initialDataUrl={null}
            onDrawingChange={setDrawingUrl}
            className="mx-auto"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {drawingUrl ? 'Dessin prêt à valider.' : 'Commencez à dessiner pour activer « Suivant ».'}
            </span>
            <Button onClick={handleNext} disabled={!drawingUrl}>
              {isLast ? 'Soumettre' : 'Suivant'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StimulusImage({ item }: { item: number }) {
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    setFailed(false)
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [item])
  if (failed) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-muted-foreground/40 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        <ImageOff className="h-6 w-6" />
        <div className="font-mono text-xs">motrice_{item}.jpg</div>
        <div>Image manquante — placez-la dans <code>public/images/motrice/</code>.</div>
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      ref={ref}
      src={motriceImagePath(item)}
      alt={`Stimulus item ${item}`}
      className="mx-auto max-h-[400px] w-full rounded border bg-white object-contain"
      onError={() => setFailed(true)}
    />
  )
}
