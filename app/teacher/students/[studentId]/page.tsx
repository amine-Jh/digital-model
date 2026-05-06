'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/dashboard-cards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { listMyStudentsView, listSessionsForStudent } from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import {
  mergeCatalogWithSessions,
  groupTestsByDomain,
  averageCompletedScore,
} from '@/lib/student-test-progress'
import { mergeRosterWithSessions, type RosterStudentRow } from '@/lib/teacher-cohort-stats'
import type { Database } from '@/lib/types/database'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ArrowLeft, Mail, Calendar, Award, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ChartAreaSkeleton, ValueTextSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

interface StudentDetailsPageProps {
  params: {
    studentId: string
  }
}

export default function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const { catalog } = useTestsCatalog()
  const [student, setStudent] = useState<RosterStudentRow | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadState('loading')
    Promise.all([listMyStudentsView(), listSessionsForStudent(params.studentId)])
      .then(([rosterRes, sessRes]) => {
        if (cancelled) return
        const roster = rosterRes.data ?? []
        const sess = sessRes.data ?? []
        const merged = mergeRosterWithSessions(roster, sess)
        const found = merged.find((s) => s.id === params.studentId) ?? null
        setStudent(found)
        setSessions(sess)
        if (!found) router.replace('/teacher/students')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
      .finally(() => {
        if (!cancelled) setLoadState('ready')
      })
    return () => {
      cancelled = true
    }
  }, [user, params.studentId, router])

  const mergedTests = useMemo(
    () => mergeCatalogWithSessions(catalog, sessions),
    [catalog, sessions],
  )

  const groupedDomains = useMemo(() => groupTestsByDomain(mergedTests), [mergedTests])

  const radarData = useMemo(
    () =>
      groupedDomains.map(({ domain, tests }) => ({
        capacity: domain.length > 18 ? `${domain.slice(0, 16)}…` : domain,
        score: averageCompletedScore(tests),
      })),
    [groupedDomains],
  )

  const attemptHistory = useMemo(() => {
    const testToDomain = new Map(catalog.map((t) => [t.id, t.domain]))
    const testToTitle = new Map(catalog.map((t) => [t.id, t.title]))
    return [...sessions]
      .filter((s) => s.status === 'completed' && s.score != null)
      .sort(
        (a, b) =>
          new Date(a.completed_at ?? a.started_at).getTime() -
          new Date(b.completed_at ?? b.started_at).getTime(),
      )
      .map((s, i) => ({
        attempt: String(i + 1),
        date: new Date(s.completed_at ?? s.started_at).toLocaleDateString('fr-FR'),
        score: Math.round(Number(s.score)),
        domain: testToDomain.get(s.test_id) ?? s.test_id,
        testTitle: testToTitle.get(s.test_id) ?? s.test_id,
      }))
  }, [sessions, catalog])

  const weakTitles = useMemo(
    () =>
      mergedTests
        .filter(
          (t) => t.status === 'completed' && t.latestScore != null && (t.latestScore as number) < 70,
        )
        .map((t) => t.title),
    [mergedTests],
  )

  const bestScore = useMemo(() => {
    const scores = sessions
      .filter((s) => s.status === 'completed' && s.score != null)
      .map((s) => Math.round(Number(s.score)))
    return scores.length > 0 ? Math.max(...scores) : null
  }, [sessions])

  if (authLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="teacher" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header title="Profil élève" subtitle="Chargement…" />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-56" />
                <div className="grid grid-cols-2 gap-4">
                  <ValueTextSkeleton className="h-10 w-full max-w-[8rem]" />
                  <ValueTextSkeleton className="h-10 w-full max-w-[8rem]" />
                </div>
              </CardContent>
            </Card>
            <ChartAreaSkeleton height={260} />
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-muted-foreground text-sm">Connexion requise.</p>
        <Button variant="outline" asChild>
          <Link href="/">Retour</Link>
        </Button>
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="teacher" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header
            title="Profil élève"
            subtitle="Chargement des données d&apos;évaluation…"
          />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Class
            </Button>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-64 max-w-full" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full max-w-xs" />
                    <Skeleton className="h-4 w-full max-w-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <ValueTextSkeleton className="h-9 w-20" />
                    </div>
                    <div className="rounded-lg border p-3 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <ValueTextSkeleton className="h-9 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartAreaSkeleton height={240} />
              <ChartAreaSkeleton height={240} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          Impossible de charger les données.
        </p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">
          Élève introuvable ou hors de votre périmètre.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="teacher" />

      <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
        <Header
          title={`Profil élève : ${student.name}`}
          subtitle="Progression détaillée et historique des évaluations (Supabase)"
        />

        <main className="p-4 md:p-6 pt-24 max-w-7xl">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Class
          </Button>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">{student.name}</CardTitle>
              <CardDescription>
                {student.scholarLevel ? `Niveau : ${student.scholarLevel}` : 'Profil élève'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Gmail</p>
                      <p className="text-sm font-medium text-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Compte</p>
                      <p className="text-sm font-medium text-foreground">Roster enseignant</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Score moyen</p>
                    <p className="text-2xl font-bold text-primary">
                      {student.completedTests > 0 ? `${student.averageScore.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-secondary/5 rounded-lg p-3 border border-secondary/20">
                    <p className="text-xs text-muted-foreground mb-1">Tests réalisés</p>
                    <p className="text-2xl font-bold text-secondary">{student.completedTests}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Moyenne mathématiques 2024 / 2025
                  </p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">
                    {student.mathAverage2024_2025 != null
                      ? `${student.mathAverage2024_2025.toFixed(1)} / 20`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Moyenne mathématiques 2025 / 2026
                  </p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">
                    {student.mathAverage2025_2026 != null
                      ? `${student.mathAverage2025_2026.toFixed(1)} / 20`
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Award className="w-5 h-5" />}
              title="Current Avg"
              value={student.completedTests > 0 ? `${student.averageScore.toFixed(1)}%` : '—'}
              description="Sessions terminées"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Total Tests"
              value={student.completedTests}
              description="Completed assessments"
            />
            <StatCard
              icon={<AlertCircle className="w-5 h-5" />}
              title="Focus Areas"
              value={weakTitles.length}
              description="Tests terminés sous 70 %"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              title="Best Score"
              value={bestScore != null ? `${bestScore}%` : '—'}
              description="Meilleure épreuve"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Capacity Profile</CardTitle>
                <CardDescription>Score moyen par domaine (catalogue + sessions)</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    Pas encore de domaine avec scores.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="capacity" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#1e3a8a"
                        fill="#1e3a8a"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain Progress</CardTitle>
                <CardDescription>Moyenne par domaine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {groupedDomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                ) : (
                  groupedDomains.slice(0, 6).map(({ domain, tests }) => {
                    const pct = averageCompletedScore(tests)
                    return (
                      <div key={domain}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{domain}</span>
                          <span className="text-sm font-bold text-primary">{pct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
              <CardDescription>Scores des évaluations terminées (ordre chronologique)</CardDescription>
            </CardHeader>
            <CardContent>
              {attemptHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Aucune session terminée enregistrée.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={attemptHistory}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#1e3a8a"
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
              <CardDescription>Sessions terminées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attemptHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun historique.</p>
                ) : (
                  attemptHistory.map((attempt, idx) => (
                    <div
                      key={`${attempt.date}-${attempt.score}-${idx}`}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{attempt.testTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.domain} · {attempt.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{attempt.score}%</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Areas Needing Support</CardTitle>
              </CardHeader>
              <CardContent>
                {weakTitles.length > 0 ? (
                  <div className="space-y-2">
                    {weakTitles.map((area) => (
                      <div
                        key={area}
                        className="flex items-center gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20"
                      >
                        <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                        <span className="text-sm text-foreground">{area}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No weak areas identified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Teacher Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Send Assignment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Schedule Review
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Print Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Message Student
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
