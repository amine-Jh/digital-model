'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Database } from '@/lib/types/database'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  Activity,
  CheckCircle2,
  Clock,
  Circle,
  FileSignature,
} from 'lucide-react'
import { getDomainPresentation } from '@/lib/domain-ui'
import { useAuth } from '@/lib/auth-context'
import { listMySessions } from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import {
  mergeCatalogWithSessions,
  groupTestsByDomain,
  averageCompletedScore,
  type TestWithProgress,
} from '@/lib/student-test-progress'
import {
  getLatestResultForUser,
  BEERY_MOTRICE_ITEM_COUNT,
  BeeryMotriceResult,
} from '@/lib/beery-motrice'
import { getLatestDAResult, DARResult } from '@/lib/attentional/divided-attention'
import { getLatestSAResult, SAResult } from '@/lib/attentional/selective-attention'
import { getLatestSARTResult, SARTResult } from '@/lib/attentional/sustained-attention'
import { getLatestTMTResult, TMTResult } from '@/lib/attentional/trail-making'
import { getLatestShAResult, ShAResult } from '@/lib/attentional/shifting-attention'
import { getLatestRAVLTResult, RAVLTResult } from '@/lib/memory/ravlt'
import { getLatestDigitSpanResult, DigitSpanResult } from '@/lib/memory/digit-span'
import { ChartAreaSkeleton, ValueHeadlineSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')
    return (
      <Badge className="gap-1 text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </Badge>
    )
  if (status === 'in-progress')
    return (
      <Badge className="gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        <Clock className="w-3 h-3" /> In progress
      </Badge>
    )
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Circle className="w-3 h-3" /> Upcoming
    </Badge>
  )
}

function AttStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-red-500'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const { catalog, fromDatabase } = useTestsCatalog()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [resultsFetchError, setResultsFetchError] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const mergedTests = useMemo(
    () => mergeCatalogWithSessions(catalog, user ? sessions : []),
    [catalog, sessions, user],
  )
  const [beery, setBeery] = useState<BeeryMotriceResult | null>(null)
  const [da, setDa] = useState<DARResult | null>(null)
  const [sa, setSa] = useState<SAResult | null>(null)
  const [sart, setSart] = useState<SARTResult | null>(null)
  const [tmt, setTmt] = useState<TMTResult | null>(null)
  const [sha, setSha] = useState<ShAResult | null>(null)
  const [ravlt, setRavlt] = useState<RAVLTResult | null>(null)
  const [digitSpan, setDigitSpan] = useState<DigitSpanResult | null>(null)

  useEffect(() => {
    const refresh = () => {
      const name = user?.username
      if (!name) {
        setBeery(null)
        setDa(null); setSa(null); setSart(null); setTmt(null); setSha(null)
        setRavlt(null); setDigitSpan(null)
        return
      }
      setBeery(getLatestResultForUser(name) ?? null)
      setDa(getLatestDAResult(name) ?? null)
      setSa(getLatestSAResult(name) ?? null)
      setSart(getLatestSARTResult(name) ?? null)
      setTmt(getLatestTMTResult(name) ?? null)
      setSha(getLatestShAResult(name) ?? null)
      setRavlt(getLatestRAVLTResult(name) ?? null)
      setDigitSpan(getLatestDigitSpanResult(name) ?? null)
    }
    refresh()
    window.addEventListener('beery-motrice-changed', refresh)
    window.addEventListener('attentional-changed', refresh)
    window.addEventListener('memory-changed', refresh)
    window.addEventListener('geometry-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('beery-motrice-changed', refresh)
      window.removeEventListener('attentional-changed', refresh)
      window.removeEventListener('memory-changed', refresh)
      window.removeEventListener('geometry-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setSessions([])
      setSessionsLoading(false)
      setResultsFetchError(null)
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    setResultsFetchError(null)
    listMySessions({ limit: 500 })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setResultsFetchError(error)
          setSessions([])
          return
        }
        setSessions(data)
      })
      .catch(() => {
        if (!cancelled) {
          setResultsFetchError('Could not load your sessions.')
          setSessions([])
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, fromDatabase])

  const groupedDomains = useMemo(
    () => groupTestsByDomain(mergedTests),
    [mergedTests],
  )
  const totalTests = mergedTests.length
  const completedTests = mergedTests.filter((t) => t.status === 'completed').length
  const completedWithScore = mergedTests.filter(
    (t) => t.status === 'completed' && t.latestScore != null,
  )
  const overallScoreLabel =
    completedWithScore.length > 0
      ? `${averageCompletedScore(mergedTests)}%`
      : '—'

  if (authLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="student" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header
            title="Résultats des évaluations"
            subtitle="Vos performances par domaine cognitif et par test"
          />
          <main className={cn('p-4 md:p-6 pt-24 max-w-5xl space-y-6', isMobile && 'pb-20')}>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <ValueHeadlineSkeleton className="mx-auto" />
                    <Skeleton className="h-3 w-32 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <ChartAreaSkeleton height={200} />
          </main>
        </div>
      </div>
    )
  }

  /** Supabase session list merged into catalogue — when false, only show grey placeholders for scores. */
  const sessionDataReady = !user || !sessionsLoading

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="student" />

      <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
        <Header
          title="Résultats des évaluations"
          subtitle="Vos performances par domaine cognitif et par test"
        />

        <main className={cn('p-4 md:p-6 pt-24 max-w-5xl', isMobile && 'pb-20')}>
          {resultsFetchError && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {resultsFetchError} Les domaines ci-dessous reflètent le catalogue seulement jusqu&apos;à la
              prochaine synchronisation.
            </p>
          )}

          <p className="mb-6 text-xs text-muted-foreground">
            Les tableaux par domaine proviennent de votre compte (sessions Supabase). Les encarts
            mémoire / attention / Beery ci-dessus utilisent le stockage local de ce navigateur lorsque
            vous avez passé ces épreuves ici.
          </p>

          {/* ── Summary bar ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                {user && !sessionDataReady ? (
                  <ValueHeadlineSkeleton className="mx-auto" />
                ) : (
                  <p className="text-3xl font-bold text-primary">{overallScoreLabel}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Moyenne score (tests terminés)</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                {user && !sessionDataReady ? (
                  <ValueHeadlineSkeleton className="mx-auto" />
                ) : (
                  <p className="text-3xl font-bold text-green-600">{completedTests}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Tests completed</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                {user && !sessionDataReady ? (
                  <ValueHeadlineSkeleton className="mx-auto" />
                ) : (
                  <p className="text-3xl font-bold text-muted-foreground">{totalTests}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Total tests</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Mémoire (résultats persistés) ────────────────────────────────── */}
          {(ravlt || digitSpan) && (
            <Card className="mb-6 border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-rose-600" />
                  <CardTitle className="text-base">Capacités de mémoire — derniers résultats</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 md:grid-cols-2">
                  {digitSpan && (
                    <AttStat
                      label="Digit Span"
                      value={`${digitSpan.score}%`}
                      detail={`${digitSpan.correctCount}/${digitSpan.trials.length}`}
                    />
                  )}
                  {ravlt && (
                    <AttStat
                      label="RAVLT"
                      value={`${ravlt.totalScore}`}
                      detail={`/80 · ${Object.keys(ravlt.levels).length}/6 niveaux`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Beery VMI (résultat corrigé par l'admin) ────────────────────── */}
          {beery && (
            <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-amber-500/10 p-2 text-amber-600">
                      <FileSignature className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Beery VMI — Intégration visuo-motrice
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Traitement visuel · Corrigé par un administrateur le{' '}
                        {new Date(beery.validatedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Brut</p>
                      <p className="text-lg font-bold">{beery.rawScore}/{BEERY_MOTRICE_ITEM_COUNT}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Standard</p>
                      <p className="text-lg font-bold">{beery.standardScore}</p>
                    </div>
                    <Badge className="bg-amber-600 text-white">{beery.niveau}</Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* ── Capacités attentionnelles (résultats persistés) ───────────── */}
          {(da || sa || sart || tmt || sha) && (
            <Card className="mb-6 border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Capacités attentionnelles — derniers résultats</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
                  {da && <AttStat label="Attention divisée" value={`${da.score}%`} detail={`${da.correctCount}/${da.trials.length}`} />}
                  {sa && <AttStat label="Attention sélective" value={`${sa.score}%`} detail={`${sa.correctCount}/${sa.trials.length}`} />}
                  {sart && <AttStat label="Attention soutenue" value={`${sart.score}%`} detail={`C:${sart.commissionErrors} · O:${sart.omissionErrors}`} />}
                  {tmt && <AttStat label="Trail Making" value={`${tmt.score}`} detail={`B−A: ${Math.round(tmt.switchCost/1000)}s`} />}
                  {sha && <AttStat label="Flexibilité" value={`${sha.score}%`} detail={`Switch: ${sha.switchCost}ms`} />}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Domain → Tests → Scores (Supabase-backed) ───────────────────── */}
          <div className="space-y-6">
            {groupedDomains.map(({ domain, tests }) => {
              const ui = getDomainPresentation(domain)
              const completed = tests.filter((t) => t.status === 'completed').length
              const total = tests.length

              return (
                <Card key={domain} className="overflow-hidden">
                  <CardHeader
                    className="pb-3"
                    style={{ borderLeft: `4px solid ${ui.color}` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: ui.color }}>{ui.icon}</span>
                        <div>
                          <CardTitle className="text-base">{domain}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {ui.nameFr} · {completed}/{total} terminés — score final par test ci-dessous
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="divide-y divide-border">
                      {tests.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  user && !sessionDataReady
                                    ? '#e4e4e7'
                                    : test.status === 'completed'
                                      ? '#16a34a'
                                      : test.status === 'in-progress'
                                        ? '#f59e0b'
                                        : '#d1d5db',
                              }}
                            />
                            <span className="truncate text-sm font-medium">{test.title}</span>
                          </div>

                          <div className="flex-shrink-0">
                            {user && !sessionDataReady ? (
                              <Skeleton className="h-6 w-24 rounded-full" />
                            ) : (
                              <StatusBadge status={test.status} />
                            )}
                          </div>

                          <div className="w-16 flex-shrink-0 text-right">
                            {user && !sessionDataReady ? (
                              <Skeleton className="h-5 w-10 rounded ml-auto" />
                            ) : test.status === 'completed' && test.latestScore != null ? (
                              <span
                                className={cn('text-sm font-bold', scoreColor(test.latestScore))}
                              >
                                {test.latestScore}%
                              </span>
                            ) : test.status === 'in-progress' ? (
                              <span className="text-xs text-amber-600">En cours</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
