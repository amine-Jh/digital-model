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
import { listMyStudentsView, listSessionsForStudentIds } from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import {
  mergeRosterWithSessions,
  classDomainAveragesFromSessions,
  weeklyCompletionCounts,
  weakDomainsFromSessions,
  type RosterStudentRow,
} from '@/lib/teacher-cohort-stats'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter,
} from 'recharts'
import { Users, TrendingUp, AlertCircle, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { isAdminAreaRole } from '@/lib/auth-types'
import type { Database } from '@/lib/types/database'
import { ChartAreaSkeleton, ValueTextSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

export default function TeacherDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { catalog } = useTestsCatalog()
  const isMobile = useIsMobile()
  const [myStudents, setMyStudents] = useState<RosterStudentRow[]>([])
  const [cohortSessions, setCohortSessions] = useState<SessionRow[]>([])
  const [cohortError, setCohortError] = useState<string | null>(null)
  const [cohortLoading, setCohortLoading] = useState(false)

  const classDomainData = useMemo(
    () => classDomainAveragesFromSessions(catalog, cohortSessions),
    [catalog, cohortSessions],
  )
  const weeklyTrend = useMemo(
    () => weeklyCompletionCounts(cohortSessions),
    [cohortSessions],
  )
  const weakDomains = useMemo(
    () => weakDomainsFromSessions(catalog, cohortSessions),
    [catalog, cohortSessions],
  )

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'teacher' && !isAdminAreaRole(user.role)))) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user || (user.role !== 'teacher' && !isAdminAreaRole(user.role))) return
    let cancelled = false
    setCohortLoading(true)
    setCohortError(null)
    ;(async () => {
      const rosterRes = await listMyStudentsView()
      if (cancelled) return
      const roster = rosterRes.data ?? []
      const ids = roster.map((r) => r.user_id)
      const sessRes = await listSessionsForStudentIds(ids, { limit: 2000 })
      if (cancelled) return
      const err = rosterRes.error ?? sessRes.error
      if (err) setCohortError(err)
      const sessions = sessRes.data ?? []
      setMyStudents(mergeRosterWithSessions(roster, sessions))
      setCohortSessions(sessions)
    })()
      .catch(() => {
        if (!cancelled) setCohortError('Could not load roster or sessions.')
      })
      .finally(() => {
        if (!cancelled) setCohortLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const totalStudents = myStudents.length
  const activeStudents = myStudents.filter((s) => s.completedTests > 0)
  const avgClassScore =
    activeStudents.length > 0
      ? (activeStudents.reduce((sum, s) => sum + s.averageScore, 0) / activeStudents.length).toFixed(1)
      : '—'
  const studentsNeedingSupport = myStudents.filter(
    (s) => s.completedTests > 0 && s.averageScore < 70,
  ).length

  const studentPerformanceScatter = myStudents.map((s) => ({
    name: s.name.split(/\s+/)[0] ?? s.name,
    testsCompleted: s.completedTests,
    avgScore: s.averageScore,
  }))

  const avgTestsPerStudent =
    totalStudents > 0
      ? (myStudents.reduce((sum, s) => sum + s.completedTests, 0) / totalStudents).toFixed(1)
      : '0.0'

  const cohortReady = !cohortLoading

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="teacher" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header
            title="Tableau de bord professeur"
            subtitle="Gérez vos élèves et suivez la progression de la classe"
          />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-5 rounded" />
                  </CardHeader>
                  <CardContent>
                    <ValueTextSkeleton className="h-9 w-20" />
                    <Skeleton className="h-3 w-36 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <ChartAreaSkeleton height={280} />
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

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="teacher" userName={user.username} />
      
      <div className={cn("transition-all duration-200", isMobile ? "ml-0" : "ml-64")}>
        <Header
          title="Tableau de bord professeur"
          subtitle="Gérez vos élèves et suivez la progression de la classe"
        />

        <main className="p-4 md:p-6 pt-24 max-w-7xl">
          {cohortError && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {cohortError} Certaines cartes peuvent être incomplètes.
            </p>
          )}
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cohortReady ? (
              <>
            <StatCard
              icon={<Users className="w-5 h-5" />}
              title="Total Students"
              value={totalStudents}
              description="Roster (my_students)"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Class Average"
              value={avgClassScore === '—' ? '—' : `${avgClassScore}%`}
              description="Élèves ayant au moins une session terminée"
            />
            <StatCard
              icon={<AlertCircle className="w-5 h-5" />}
              title="Need Support"
              value={studentsNeedingSupport}
              description="Élèves sous 70 % (avec au moins une session)"
            />
            <StatCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Avg Tests/Student"
              value={avgTestsPerStudent}
              description="Sessions terminées / élève"
            />
              </>
            ) : (
              <>
                {[
                  'Total Students',
                  'Class Average',
                  'Need Support',
                  'Avg Tests/Student',
                ].map((title) => (
                  <Card key={title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                      </CardTitle>
                      <Skeleton className="h-5 w-5 rounded" />
                    </CardHeader>
                    <CardContent>
                      <ValueTextSkeleton className="h-9 w-20" />
                      <Skeleton className="h-3 w-40 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analytics</CardTitle>
                <CardDescription>Filtres et rapports de cohorte</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/analytics">Ouvrir l&apos;analytique</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Domain Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Class Performance by Domain</CardTitle>
                <CardDescription>Average scores across cognitive domains</CardDescription>
              </CardHeader>
              <CardContent>
                {!cohortReady ? (
                  <ChartAreaSkeleton height={300} />
                ) : classDomainData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    Pas encore de scores agrégés par domaine (sessions terminées visibles sous RLS).
                  </p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classDomainData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="domain" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avgScore" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Student Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Student Distribution</CardTitle>
                <CardDescription>Tests completed vs average score</CardDescription>
              </CardHeader>
              <CardContent>
                {!cohortReady ? (
                  <ChartAreaSkeleton height={300} />
                ) : studentPerformanceScatter.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    Aucun élève dans le roster ou données encore vides.
                  </p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="testsCompleted"
                      name="Tests Completed"
                      label={{ value: 'Tests Completed', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="avgScore"
                      name="Avg Score"
                      label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter name="Students" data={studentPerformanceScatter} fill="#1e3a8a" />
                  </ScatterChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion Trend */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Assessment Completion Trend</CardTitle>
              <CardDescription>Nombre de sessions terminées par semaine (cohorte visible)</CardDescription>
            </CardHeader>
            <CardContent>
              {!cohortReady ? (
                <ChartAreaSkeleton height={250} />
              ) : weeklyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Aucune complétion enregistrée sur la période.
                </p>
              ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completion"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ fill: '#0d9488', r: 5 }}
                    name="Completions"
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Weak Areas Identified */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Identified Weak Areas</CardTitle>
                <CardDescription>Domaines avec scores moyens plus bas (sessions terminées)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!cohortReady ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-40 rounded" />
                          <Skeleton className="h-3 w-56 rounded" />
                        </div>
                        <Skeleton className="h-8 w-10 rounded" />
                      </div>
                    ))
                  ) : weakDomains.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Pas assez de données pour classer les domaines.</p>
                  ) : (
                    weakDomains.map((area) => (
                      <div key={area.name} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{area.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {area.students} élève{area.students !== 1 ? 's' : ''} avec épreuve sous 70 %
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-warning">{area.students}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Generate Class Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Assign New Assessment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Send Announcements
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Export Performance Data
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Class Roster</CardTitle>
                <CardDescription>
                  Vous ne voyez que les élèves rattachés à votre compte enseignant.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/students">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!cohortReady ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10 w-full rounded-md" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Nom
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Gmail
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Niveau scolaire
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Score moyen
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Tests réalisés
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Moy. 2024/25
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Moy. 2025/26
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {myStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-foreground font-medium">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {student.email}
                        </td>
                        <td className="py-3 px-4 text-foreground text-xs">
                          {student.scholarLevel ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={
                              student.averageScore >= 75
                                ? 'text-success font-semibold'
                                : student.averageScore >= 70
                                  ? 'text-warning font-semibold'
                                  : 'text-destructive font-semibold'
                            }
                          >
                            {student.averageScore.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-foreground">
                          {student.completedTests}
                        </td>
                        <td className="py-3 px-4 text-center text-foreground tabular-nums">
                          {student.mathAverage2024_2025 != null
                            ? `${student.mathAverage2024_2025.toFixed(1)} / 20`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center text-foreground tabular-nums">
                          {student.mathAverage2025_2026 != null
                            ? `${student.mathAverage2025_2026.toFixed(1)} / 20`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/teacher/students/${student.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
