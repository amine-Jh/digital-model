'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listMyStudentsView, listSessionsForStudentIds } from '@/lib/results/results-service'
import { mergeRosterWithSessions, type RosterStudentRow } from '@/lib/teacher-cohort-stats'
import { useAuth } from '@/lib/auth-context'
import { isAdminAreaRole } from '@/lib/auth-types'
import type { Database } from '@/lib/types/database'
import { Skeleton } from '@/components/ui/skeleton'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

export default function TeacherStudentsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const isMobile = useIsMobile()
  const [myStudents, setMyStudents] = useState<RosterStudentRow[]>([])
  const [cohortSessions, setCohortSessions] = useState<SessionRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

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
        if (!cancelled) setLoadError('Could not load roster or sessions.')
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
          <Header title="Élèves" subtitle="Roster et évaluations terminées" />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-sm text-muted-foreground max-w-sm">
          Connexion requise.
        </p>
        <Button asChild>
          <Link href="/">Retour</Link>
        </Button>
      </div>
    )
  }

  const completedSessions = cohortSessions.filter((s) => s.status === 'completed')

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="teacher" userName={user.username} />
      <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
        <Header
          title="Élèves"
          subtitle="Uniquement les élèves rattachés à votre compte — sessions visibles via RLS"
        />
        <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
          {loadError && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {loadError} Certaines données peuvent être incomplètes.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Élèves dans le roster
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
                  Sessions terminées (cohorte)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {dataLoading ? '—' : completedSessions.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avec au moins une épreuve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {dataLoading
                    ? '—'
                    : myStudents.filter((s) => s.completedTests > 0).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Liste des élèves</CardTitle>
                <CardDescription>
                  « Tests réalisés » = sessions terminées avec score. Détail par épreuve sur la fiche
                  élève.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/dashboard">Tableau de bord</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Nom</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Niveau</th>
                        <th className="text-center py-3 px-4 font-semibold">Score moyen</th>
                        <th className="text-center py-3 px-4 font-semibold">Tests passés</th>
                        <th className="text-center py-3 px-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium">{student.name}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {student.email}
                          </td>
                          <td className="py-3 px-4 text-xs">{student.scholarLevel ?? '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={
                                student.completedTests === 0
                                  ? 'text-muted-foreground'
                                  : student.averageScore >= 75
                                    ? 'text-success font-semibold'
                                    : student.averageScore >= 70
                                      ? 'text-warning font-semibold'
                                      : 'text-destructive font-semibold'
                              }
                            >
                              {student.completedTests > 0
                                ? `${student.averageScore.toFixed(1)}%`
                                : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums">
                            {student.completedTests}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href={`/teacher/students/${student.id}`}>
                              <Button variant="ghost" size="sm">
                                Voir
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {myStudents.length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Aucun élève dans votre roster (vérifiez les rattachements dans les profils
                      élèves).
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
