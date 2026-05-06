'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth-context'
import { listMySessions } from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import {
  mergeCatalogWithSessions,
  groupTestsByDomain,
  averageCompletedScore,
  completedSessionsChronology,
  type TestWithProgress,
} from '@/lib/student-test-progress'
import { computeTvps3MeanPercent } from '@/lib/tvps-aggregate-score'
import { getDomainPresentation } from '@/lib/domain-ui'
import type { Database } from '@/lib/types/database'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, Clock, CheckCircle2, BookOpen,
  ChevronRight,
} from 'lucide-react'
import { ChartAreaSkeleton, ValueTextSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Completed</Badge>
  if (status === 'in-progress')
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">In progress</Badge>
  return <Badge variant="outline" className="text-xs text-muted-foreground">Upcoming</Badge>
}

function CustomBarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { fullName: string; score: number } }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-border rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold">{d.fullName}</p>
      <p className="text-primary font-bold">{d.score}%</p>
    </div>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { catalog, fromDatabase } = useTestsCatalog()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [dashFetchError, setDashFetchError] = useState<string | null>(null)
  const [tvpsTick, setTvpsTick] = useState(0)
  const isMobile = useIsMobile()

  const mergedTests = useMemo(
    () => mergeCatalogWithSessions(catalog, sessions),
    [catalog, sessions],
  )

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) {
      setSessions([])
      setSessionsLoading(false)
      setDashFetchError(null)
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    setDashFetchError(null)
    listMySessions({ limit: 500 })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setDashFetchError(error)
          setSessions([])
          return
        }
        setSessions(data)
      })
      .catch(() => {
        if (!cancelled) {
          setDashFetchError('Could not load your sessions.')
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

  useEffect(() => {
    const onStorage = () => setTvpsTick((n) => n + 1)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const groupedDomains = useMemo(() => groupTestsByDomain(mergedTests), [mergedTests])

  const domainCards = useMemo(
    () =>
      groupedDomains.map(({ domain, tests }) => {
        const ui = getDomainPresentation(domain)
        return { domain, tests, ui, score: averageCompletedScore(tests) }
      }),
    [groupedDomains],
  )

  const domainPerformanceData = useMemo(
    () =>
      domainCards.map((d) => ({
        domain: d.domain.length > 14 ? `${d.domain.slice(0, 12)}…` : d.domain,
        fullName: d.domain,
        score: d.score,
        fill: d.ui.color,
      })),
    [domainCards],
  )

  const timeline = useMemo(
    () => completedSessionsChronology(catalog, sessions),
    [catalog, sessions],
  )

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="student" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header title="Tableau de bord" subtitle="Suivi de votre progression cognitive" />
          <main className={cn('p-4 md:p-6 pt-24 max-w-7xl mx-auto space-y-6', isMobile && 'pb-20')}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <Skeleton className="h-3 w-28" />
                    <ValueTextSkeleton className="h-9 w-16" />
                    <Skeleton className="h-3 w-36" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Domain Performance</CardTitle>
                <CardDescription>Scores moyens par domaine (sessions terminées)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartAreaSkeleton height={280} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Test Status</CardTitle>
                <CardDescription>Répartition sur le catalogue</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartAreaSkeleton height={180} />
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-sm text-muted-foreground max-w-sm">
          Your session could not be loaded. Sign in again to continue.
        </p>
        <Button asChild>
          <Link href="/">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  const completedCount = mergedTests.filter((t) => t.status === 'completed').length
  const inProgressCount = mergedTests.filter((t) => t.status === 'in-progress').length
  const upcomingCount = mergedTests.filter((t) => t.status === 'upcoming').length
  const totalCatalog = mergedTests.length

  const pieData = [
    { name: 'Completed tests', value: completedCount, fill: '#16a34a' },
    { name: 'In-progress tests', value: inProgressCount, fill: '#f59e0b' },
    { name: 'Upcoming tests', value: upcomingCount, fill: '#64748b' },
  ]

  const completedWithScore = mergedTests.filter(
    (t) => t.status === 'completed' && t.latestScore != null,
  )
  const avgScore =
    completedWithScore.length > 0 ? averageCompletedScore(mergedTests) : null

  const tvpsMean = useMemo(() => {
    void tvpsTick
    return computeTvps3MeanPercent(mergedTests)
  }, [mergedTests, tvpsTick])

  const scoredDomains = domainCards.filter((d) => d.tests.some((t) => t.latestScore != null))
  const strengths = scoredDomains
    .filter((d) => d.score >= 50)
    .sort((a, b) => b.score - a.score)
  const weaknesses = scoredDomains
    .filter((d) => d.score < 50)
    .sort((a, b) => a.score - b.score)
  const sessionDataReady = !sessionsLoading

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole={user.role} />
      {user.role === 'student' && <MobileNav userRole="student" />}

      <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
        <Header title="Tableau de bord" subtitle="Suivi de votre progression cognitive" />

        <main className={cn('p-4 md:p-6 pt-24 max-w-7xl mx-auto', isMobile && 'pb-20')}>
          {dashFetchError && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {dashFetchError} Les graphiques utilisent le catalogue jusqu&apos;à la prochaine
              synchronisation.
            </p>
          )}

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-primary mb-1">
                Invitation à participer à une recherche
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vous êtes invité(e) à participer à une recherche visant à mieux comprendre les
                processus d&apos;apprentissage au cycle secondaire qualifiant. Toutes les données sont
                anonymisées — ENS Fès, USMBA.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: <TrendingUp className="w-5 h-5" />,
                title: 'Overall Score',
                value: avgScore != null ? `${avgScore}%` : '—',
                sub: 'Moyenne des tests terminés',
              },
              {
                icon: <CheckCircle2 className="w-5 h-5" />,
                title: 'Completed',
                value: completedCount,
                sub: `${totalCatalog} au catalogue`,
              },
              {
                icon: <Clock className="w-5 h-5" />,
                title: 'In Progress',
                value: inProgressCount,
                sub: 'En cours',
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'Upcoming',
                value: upcomingCount,
                sub: 'Pas encore commencés',
              },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{s.title}</p>
                    <span className="text-primary">{s.icon}</span>
                  </div>
                  {sessionDataReady ? (
                    <p className="text-2xl font-bold">{s.value}</p>
                  ) : (
                    <ValueTextSkeleton className="h-9 w-20" />
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Domain Performance</CardTitle>
                <CardDescription>Scores moyens par domaine (sessions terminées)</CardDescription>
              </CardHeader>
              <CardContent>
                {!sessionDataReady ? (
                  <ChartAreaSkeleton height={280} />
                ) : domainPerformanceData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    Aucune évaluation terminée avec score pour l&apos;instant.
                  </p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={domainPerformanceData}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                          {domainPerformanceData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {domainCards.map((d) => (
                        <div key={d.domain} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: d.ui.color }}
                          />
                          <span className="text-muted-foreground">{d.domain}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Status</CardTitle>
                <CardDescription>Répartition sur le catalogue</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {!sessionDataReady ? (
                  <ChartAreaSkeleton height={180} />
                ) : (
                  <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2 mt-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Scores des évaluations terminées, dans l&apos;ordre chronologique</CardDescription>
            </CardHeader>
            <CardContent>
              {!sessionDataReady ? (
                <ChartAreaSkeleton height={240} />
              ) : timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Passez des tests jusqu&apos;au bout pour voir votre courbe de progression ici.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timeline} margin={{ top: 5, right: 20, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="test"
                      tick={{ fontSize: 10 }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      cursor={{ stroke: '#e2e8f0' }}
                    />
                    <Legend verticalAlign="top" />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Score (%)"
                      stroke="#1e3a8a"
                      strokeWidth={2.5}
                      dot={{ fill: '#1e3a8a', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Capacity Profile</CardTitle>
              <CardDescription>Forces et axes de progrès par domaine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {domainCards.map((d) => (
                <div key={d.domain} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ color: d.ui.color }}>{d.ui.icon}</span>
                      <span className="font-medium">{d.domain}</span>
                    </div>
                    <span className="font-bold tabular-nums" style={{ color: d.ui.color }}>
                      {sessionDataReady ? (
                        d.tests.some((t) => t.latestScore != null) ? `${d.score}%` : '—'
                      ) : (
                        <ValueTextSkeleton className="h-6 w-14 inline-block align-middle" />
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    {sessionDataReady ? (
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${d.score}%`, backgroundColor: d.ui.color }}
                      />
                    ) : (
                      <Skeleton className="h-full w-2/3 rounded-full" />
                    )}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">
                    Forces (score moyen du domaine ≥ 50 %)
                  </p>
                  {strengths.length === 0 ? (
                    <p className="text-xs text-green-800/80">Aucun domaine ≥ 50 % avec score enregistré.</p>
                  ) : null}
                  {strengths.map((d) => (
                    <div key={d.domain} className="flex items-center justify-between text-sm py-1">
                      <span className="text-green-800">{d.domain}</span>
                      <span className="font-bold text-green-700">
                        {sessionDataReady ? (
                          d.tests.some((t) => t.latestScore != null) ? `${d.score}%` : '—'
                        ) : (
                          <ValueTextSkeleton className="h-5 w-12 inline-block" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">
                    Axes à renforcer (score moyen du domaine &lt; 50 %)
                  </p>
                  {weaknesses.length === 0 ? (
                    <p className="text-xs text-amber-800/80">Aucun domaine &lt; 50 % avec score enregistré.</p>
                  ) : null}
                  {weaknesses.map((d) => (
                    <div key={d.domain} className="flex items-center justify-between text-sm py-1">
                      <span className="text-amber-800">{d.domain}</span>
                      <span className="font-bold text-amber-700">
                        {sessionDataReady ? (
                          d.tests.some((t) => t.latestScore != null) ? `${d.score}%` : '—'
                        ) : (
                          <ValueTextSkeleton className="h-5 w-12 inline-block" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                <p className="text-sm font-semibold text-violet-800 mb-1">
                  Visuoperceptual Skills (TVPS-3)
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Moyenne des sous-tests TVPS (sessions Supabase ou scores locaux du navigateur).
                </p>
                {sessionDataReady ? (
                  <p className="text-2xl font-bold tabular-nums text-violet-700">
                    {tvpsMean != null ? `${tvpsMean}%` : '—'}
                  </p>
                ) : (
                  <ValueTextSkeleton className="h-9 w-16" />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Domain Breakdown</h2>
            <div className="space-y-4">
              {domainCards.map(({ domain, tests, ui, score }) => (
                <Card key={domain}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: ui.color }}>{ui.icon}</span>
                        <CardTitle className="text-base">{domain}</CardTitle>
                      </div>
                      <span className="text-sm font-bold" style={{ color: ui.color }}>
                        {sessionDataReady ? (
                          tests.some((t) => t.latestScore != null) ? `${score}%` : '—'
                        ) : (
                          <ValueTextSkeleton className="h-6 w-14 inline-block align-middle" />
                        )}
                      </span>
                    </div>
                    {sessionDataReady ? (
                      <Progress value={score} className="h-1.5 mt-1" />
                    ) : (
                      <Skeleton className="h-1.5 w-full mt-1 rounded-full" />
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {tests.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0"
                        >
                          <Link
                            href={`/tests/${t.id}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors min-w-0"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </Link>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {sessionDataReady ? (
                              <>
                                {t.status === 'completed' && t.latestScore != null && (
                                  <span className="tabular-nums font-medium text-xs">{t.latestScore}%</span>
                                )}
                                <StatusBadge status={t.status} />
                              </>
                            ) : (
                              <>
                                <Skeleton className="h-4 w-10 rounded" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Recent Assessments</h2>
                <p className="text-sm text-muted-foreground">Évaluations par domaine</p>
              </div>
              <Button variant="outline" asChild size="sm">
                <Link href="/tests">View All</Link>
              </Button>
            </div>

            {domainCards.map(({ domain, tests, ui }) => (
              <div key={domain} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: ui.color }}>{ui.icon}</span>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {domain}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tests.map((t) => {
                    return (
                      <Link key={t.id} href={sessionDataReady && t.status === 'completed' ? '/results' : `/tests/${t.id}`}>
                        <div
                          className={cn(
                            'rounded-xl border p-4 transition-all hover:shadow-sm cursor-pointer',
                            sessionDataReady && t.status === 'completed'
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-border bg-card hover:border-primary/30',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">{t.title}</p>
                            {sessionDataReady ? (
                              <StatusBadge status={t.status} />
                            ) : (
                              <Skeleton className="h-5 w-24 rounded-full shrink-0" />
                            )}
                          </div>
                          {sessionDataReady &&
                            t.status === 'completed' &&
                            t.latestScore != null && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Score</span>
                                <span className="font-semibold">{t.latestScore}%</span>
                              </div>
                              <Progress value={t.latestScore} className="h-1" />
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
