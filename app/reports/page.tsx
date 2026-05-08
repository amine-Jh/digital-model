'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listMyStudentsView, listSessionsForStudentIds } from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import {
  mergeRosterWithSessions,
  classDomainAveragesFromSessions,
  weakDomainsFromSessions,
  type RosterStudentRow,
} from '@/lib/teacher-cohort-stats'
import { useAuth } from '@/lib/auth-context'
import { isAdminAreaRole } from '@/lib/auth-types'
import type { Database } from '@/lib/types/database'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

export default function TeacherReportsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { catalog } = useTestsCatalog()
  const isMobile = useIsMobile()
  const [myStudents, setMyStudents] = useState<RosterStudentRow[]>([])
  const [cohortSessions, setCohortSessions] = useState<SessionRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  const domainBars = useMemo(
    () => classDomainAveragesFromSessions(catalog, cohortSessions),
    [catalog, cohortSessions],
  )
  const weakAreas = useMemo(
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
    setDataLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const rosterRes = await listMyStudentsView()
        if (cancelled) return
        const roster = rosterRes.data ?? []
        const ids = roster.map((r) => r.user_id)
        const sessRes = await listSessionsForStudentIds(ids, { limit: 2000 })
        if (cancelled) return
        const err = rosterRes.error ?? sessRes.error
        if (err) setLoadError(err)
        const sessions = sessRes.data ?? []
        setMyStudents(mergeRosterWithSessions(roster, sessions))
        setCohortSessions(sessions)
      } catch {
        if (!cancelled) setLoadError('Could not load report data.')
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="teacher" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header title="Rapports" subtitle="Synthèse de cohorte" />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-sm text-muted-foreground">Connexion requise.</p>
        <Button asChild>
          <Link href="/">Retour</Link>
        </Button>
      </div>
    )
  }

  const activeStudents = myStudents.filter((s) => s.completedTests > 0)
  const classAvg =
    activeStudents.length > 0
      ? (
          activeStudents.reduce((sum, s) => sum + s.averageScore, 0) / activeStudents.length
        ).toFixed(1)
      : null

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="teacher" userName={user.username} />
      <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
        <Header
          title="Rapports"
          subtitle="Données limitées à vos élèves (politiques Supabase / RLS)"
        />
        <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
          {loadError && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {loadError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/teacher/students">Liste des élèves</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/teacher/dashboard">Tableau de bord</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Effectif roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {dataLoading ? '—' : myStudents.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Moyenne de classe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {dataLoading ? '—' : classAvg != null ? `${classAvg}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Élèves avec au moins une session terminée
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Domaines à surveiller
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {dataLoading ? '—' : weakAreas.filter((w) => w.students > 0).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Domaines avec scores &lt; 70 % (effectif concerné)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance par domaine</CardTitle>
                <CardDescription>Moyenne des scores sur sessions terminées</CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <Skeleton className="h-[280px] w-full rounded-md" />
                ) : domainBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    Pas encore de données agrégées.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={domainBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
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

            <Card>
              <CardHeader>
                <CardTitle>Points d&apos;attention</CardTitle>
                <CardDescription>
                  Domaines classés par score moyen (faible en premier) — élèves sous 70 %
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : weakAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Pas assez de données pour établir un classement.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {weakAreas.map((row) => (
                      <li
                        key={row.name}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.students} élève{row.students !== 1 ? 's' : ''} &lt; 70 %
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Synthèse par élève</CardTitle>
              <CardDescription>Prêt à partager ou exporter manuellement (copie / impression)</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <Skeleton className="h-40 w-full rounded-md" />
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2">Élève</th>
                        <th className="text-center py-2 px-2">Tests passés</th>
                        <th className="text-center py-2 px-2">Moyenne</th>
                        <th className="text-center py-2 px-2">Fiche</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myStudents.map((s) => (
                        <tr key={s.id} className="border-b border-border">
                          <td className="py-2 px-2">{s.name}</td>
                          <td className="text-center py-2 px-2 tabular-nums">{s.completedTests}</td>
                          <td className="text-center py-2 px-2">
                            {s.completedTests > 0 ? `${s.averageScore.toFixed(1)}%` : '—'}
                          </td>
                          <td className="text-center py-2 px-2">
                            <Link
                              href={`/teacher/students/${s.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Détail
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
