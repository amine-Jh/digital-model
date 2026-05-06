'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, Play, RotateCcw, CheckCircle2 } from 'lucide-react'
import { VP_SUBTESTS, CORRECTIONS, resultStorageKey, candidateFilenames } from '@/lib/visuo-perceptive'
import { listStoredImages } from '@/lib/visuo-perceptive/image-store'

export function VPHub() {
  const [stored, setStored] = useState<string[]>([])
  const [resultsMap, setResultsMap] = useState<Record<string, { pct: number; at: string } | null>>({})

  useEffect(() => {
    const refresh = () => {
      setStored(listStoredImages())
      const r: Record<string, { pct: number; at: string } | null> = {}
      for (const s of VP_SUBTESTS) {
        try {
          const raw = window.localStorage.getItem(resultStorageKey(s.id))
          if (raw) {
            const parsed = JSON.parse(raw)
            r[s.id] = { pct: parsed.percentage, at: parsed.completedAt }
          } else r[s.id] = null
        } catch {
          r[s.id] = null
        }
      }
      setResultsMap(r)
    }
    refresh()
    window.addEventListener('vp-images-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('vp-images-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const completedCount = Object.values(resultsMap).filter(Boolean).length

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Brain className="h-7 w-7 text-primary" />
            Capacités visuo-perceptives
          </h1>
          <p className="mt-1 text-muted-foreground">
            9 sous-tests — discrimination, mémoire (visuelle / séquentielle / perceptive), clôture, constance de la
            forme, figure-fond, intrus, fond caché. Chaque sous-test est autonome et scoré séparément.
          </p>
        </div>
        <div className="text-right">
          <Progress value={(completedCount / VP_SUBTESTS.length) * 100} className="w-48" />
          <p className="mt-1 text-xs text-muted-foreground">
            {completedCount}/{VP_SUBTESTS.length} sous-tests terminés
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {VP_SUBTESTS.map((s) => {
          const corr = CORRECTIONS[s.id]
          const total = Object.keys(corr).length
          const trials = s.memoryOddEven ? Math.floor(total / 2) : total
          const imagesPresent = Object.keys(corr).filter((n) =>
            candidateFilenames(s.id, parseInt(n, 10)).some((c) => stored.includes(c)),
          ).length
          const result = resultsMap[s.id]
          return (
            <Card key={s.id} className="flex flex-col p-5">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {s.category}
                </Badge>
                <Badge>{s.choices} choix</Badge>
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div>
                  {trials} essai(s){s.memoryOddEven ? ' • stimulus 3s + choix' : ''}
                </div>
                <div>
                  Images : {imagesPresent}/{total}{' '}
                  {total === 0 && <span className="text-amber-600">(à compléter)</span>}
                </div>
                {result && (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Dernier score : {Math.round(result.pct)} %
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/tests/${s.testId}`} className="flex-1">
                  <Button className="w-full" disabled={total === 0}>
                    {result ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reprendre
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Commencer
                      </>
                    )}
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Link href="/results/visuo-perceptive">
          <Button variant="outline">Voir profil cognitif & recommandations</Button>
        </Link>
      </div>
    </div>
  )
}
