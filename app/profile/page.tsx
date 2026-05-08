'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  listMySessions,
  listMyStudentsView,
  listSessionsForStudentIds,
} from '@/lib/results/results-service'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import { mergeCatalogWithSessions, averageCompletedScore } from '@/lib/student-test-progress'
import { mergeRosterWithSessions } from '@/lib/teacher-cohort-stats'
import { useAuth } from '@/lib/auth-context'
import type { StudentAcademicProfile } from '@/lib/student-profile-types'
import { Mail, User, Calendar, Award, Activity, School } from 'lucide-react'
import { ChartAreaSkeleton, ValueTextSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfilePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  const { catalog, fromDatabase } = useTestsCatalog()
  const [academic, setAcademic] = useState<StudentAcademicProfile | null>(null)
  const [studentSessionStats, setStudentSessionStats] = useState<{
    averageScore: number | null
    latestScore: number | null
    latestLabel: string | null
    latestDate: string | null
  }>({
    averageScore: null,
    latestScore: null,
    latestLabel: null,
    latestDate: null,
  })
  const [teacherOverview, setTeacherOverview] = useState<{
    studentCount: number
    classAverage: number | null
  }>({ studentCount: 0, classAverage: null })
  const [studentRemoteReady, setStudentRemoteReady] = useState(false)
  const [teacherRemoteReady, setTeacherRemoteReady] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, user, router])

  useEffect(() => {
    if (!user || user.role !== 'student') {
      setStudentRemoteReady(true)
      return
    }
    let cancelled = false
    setStudentRemoteReady(false)
    const applySessions = (data: Awaited<ReturnType<typeof listMySessions>>['data'], error: string | null) => {
      if (error || !data?.length) {
        setStudentSessionStats({
          averageScore: null,
          latestScore: null,
          latestLabel: null,
          latestDate: null,
        })
        return
      }
      const merged = mergeCatalogWithSessions(catalog, data)
      const avg = averageCompletedScore(merged)
      const hasCompleted = merged.some(
        (t) => t.status === 'completed' && t.latestScore != null,
      )
      const completed = [...data]
        .filter((s) => s.status === 'completed' && s.score != null)
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.started_at).getTime() -
            new Date(a.completed_at ?? a.started_at).getTime(),
        )
      const last = completed[0]
      const title = last ? catalog.find((t) => t.id === last.test_id)?.title ?? last.test_id : null
      setStudentSessionStats({
        averageScore: hasCompleted ? avg : null,
        latestScore: last != null ? Math.round(Number(last.score)) : null,
        latestLabel: title,
        latestDate:
          last != null
            ? new Date(last.completed_at ?? last.started_at).toLocaleDateString('fr-FR')
            : null,
      })
    }

    Promise.all([
      fetch('/api/student-profile')
        .then((r) => r.json())
        .then((d: { profile?: StudentAcademicProfile | null }) => {
          if (!cancelled) setAcademic(d.profile ?? null)
        })
        .catch(() => {
          if (!cancelled) setAcademic(null)
        }),
      listMySessions({ limit: 200 }).then(({ data, error }) => {
        if (cancelled) return
        applySessions(data, error ?? null)
      }).catch(() => {
        if (!cancelled) {
          setStudentSessionStats({
            averageScore: null,
            latestScore: null,
            latestLabel: null,
            latestDate: null,
          })
        }
      }),
    ]).finally(() => {
      if (!cancelled) setStudentRemoteReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [user, catalog, fromDatabase])

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      setTeacherRemoteReady(true)
      return
    }
    setTeacherRemoteReady(false)
    ;(async () => {
      try {
        const rosterRes = await listMyStudentsView()
        const roster = rosterRes.data ?? []
        const ids = roster.map((r) => r.user_id)
        const sessRes = await listSessionsForStudentIds(ids, { limit: 2000 })
        const sessions = sessRes.data ?? []
        const merged = mergeRosterWithSessions(roster, sessions)
        const active = merged.filter((m) => m.completedTests > 0)
        const classAvg =
          active.length > 0
            ? active.reduce((sum, m) => sum + m.averageScore, 0) / active.length
            : null
        setTeacherOverview({ studentCount: roster.length, classAverage: classAvg })
      } catch {
        setTeacherOverview({ studentCount: 0, classAverage: null })
      } finally {
        setTeacherRemoteReady(true)
      }
    })()
  }, [user])

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="student" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header title="Profil" subtitle="Chargement du profil…" />
          <main className="p-6 pt-24 max-w-7xl space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-14 w-14 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-5 w-32 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full max-w-md" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Aperçu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ValueTextSkeleton className="h-8 w-24" />
                  <ValueTextSkeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            </div>
            <ChartAreaSkeleton height={120} />
          </main>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-sm text-muted-foreground max-w-sm">
          Session introuvable. Redirection vers la connexion…
        </p>
      </div>
    )
  }

  const isTeacher = user.role === 'teacher'
  const profileBodyLoading =
    (user.role === 'student' && !studentRemoteReady) ||
    (user.role === 'teacher' && !teacherRemoteReady)
  const displayName = user.displayName?.trim() || user.username
  const displayEmail = user.username

  const totalStudents = teacherOverview.studentCount
  const classAverage = teacherOverview.classAverage

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole={user.role} />

      <div className={cn("transition-all duration-200", isMobile ? "ml-0" : "ml-64")}>
        <Header
          title="Profil"
          subtitle={isTeacher ? 'Profil enseignant et paramètres' : 'Profil élève et données académiques'}
        />

        <main className="p-6 pt-24 max-w-7xl space-y-6">
          {/* Top: identity + quick stats */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-base font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {displayName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isTeacher ? 'Enseignant — plateforme CogniTest' : 'Participant — recherche ENS Fès'}
                  </CardDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[11px] capitalize">
                      <User className="mr-1 h-3 w-3" />
                      {user.role}
                    </Badge>
                    {!isTeacher && (
                      <Badge variant="secondary" className="text-[11px]">
                        <School className="mr-1 h-3 w-3" />
                        {profileBodyLoading ? (
                          <Skeleton className="inline-block h-3 w-16 align-middle rounded" />
                        ) : (
                          academic?.gradeLevel ?? '—'
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{displayEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Mis à jour{' '}
                      {profileBodyLoading && !isTeacher ? (
                        <Skeleton className="inline-block h-4 w-24 align-middle rounded" />
                      ) : isTeacher
                        ? '—'
                        : academic?.updatedAt
                          ? new Date(academic.updatedAt).toLocaleDateString('fr-FR')
                          : '—'}
                    </span>
                  </div>
                </div>
                {!isTeacher && (
                  <p className="text-xs text-muted-foreground">
                    Les données académiques détaillées proviennent de votre dossier CogniTest lorsque
                    le profil élève a été complété. Les scores d&apos;évaluation proviennent de vos
                    sessions enregistrées dans Supabase.
                  </p>
                )}
                {isTeacher && (
                  <p className="text-xs text-muted-foreground">
                    This profile summarises your supervising role over the cohort participating in
                    the CogniTest research study.
                  </p>
                )}
                <Button variant="outline" size="sm" className="mt-1" disabled>
                  Profile editing coming soon
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {isTeacher ? 'Teaching overview' : 'Assessment overview'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Key indicators from your activity in the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {isTeacher ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Active students</p>
                        {profileBodyLoading ? (
                          <ValueTextSkeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-xl font-semibold text-foreground">
                            {totalStudents}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Class average</p>
                        {profileBodyLoading ? (
                          <ValueTextSkeleton className="h-8 w-20" />
                        ) : (
                          <p className="text-xl font-semibold text-foreground">
                            {classAverage != null ? `${classAverage.toFixed(1)}%` : '—'}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Moyenne des élèves ayant au moins une session terminée
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Overall score</p>
                        {profileBodyLoading ? (
                          <ValueTextSkeleton className="h-8 w-20" />
                        ) : (
                          <p className="text-xl font-semibold text-foreground">
                            {studentSessionStats.averageScore != null
                              ? `${studentSessionStats.averageScore}%`
                              : '—'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Latest assessment</p>
                        {profileBodyLoading ? (
                          <ValueTextSkeleton className="h-8 w-20" />
                        ) : (
                          <p className="text-xl font-semibold text-foreground">
                            {studentSessionStats.latestScore != null
                              ? `${studentSessionStats.latestScore}%`
                              : '—'}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {profileBodyLoading ? (
                            <Skeleton className="h-3 w-full max-w-[12rem] rounded mt-1" />
                          ) : (
                            <>
                              {studentSessionStats.latestLabel ?? '—'}
                              {studentSessionStats.latestDate
                                ? ` · ${studentSessionStats.latestDate}`
                                : ''}
                            </>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom: academic details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {isTeacher ? 'Institution details' : 'Academic details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {isTeacher ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Institution</span>
                      <span className="font-medium text-foreground">ENS Fès</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Contact</span>
                      <span className="font-medium text-foreground truncate max-w-[60%]">
                        {displayEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rôle</span>
                      <span className="font-medium text-foreground">Enseignant superviseur</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Âge</span>
                      <span className="font-medium text-foreground">
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-10 rounded inline-block" />
                        ) : (
                          academic?.age ?? '—'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Niveau scolaire</span>
                      <span className="font-medium text-foreground">
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-28 rounded inline-block" />
                        ) : (
                          academic?.gradeLevel ?? '—'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Enseignant référent</span>
                      <span className="font-medium text-foreground">
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-32 rounded inline-block" />
                        ) : (
                          academic?.teacherName || '—'
                        )}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {isTeacher ? 'Performance focus' : 'Mathematics performance'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {isTeacher ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Focus areas</span>
                      <span className="font-medium text-foreground">Numerical reasoning, algebra</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      Supporting interventions for students with persistent difficulties across
                      multiple domains.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Moyenne 2024 / 2025</span>
                      <span className="font-medium text-foreground">
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-20 rounded inline-block" />
                        ) : academic?.mathAverage2024_2025 != null
                          ? `${academic.mathAverage2024_2025} / 20`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Moyenne 2025 / 2026</span>
                      <span className="font-medium text-foreground">
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-20 rounded inline-block" />
                        ) : academic?.mathAverage2025_2026 != null
                          ? `${academic.mathAverage2025_2026} / 20`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Évolution</span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Award className="h-3 w-3 text-emerald-500" />
                        {profileBodyLoading ? (
                          <Skeleton className="h-5 w-16 rounded inline-block" />
                        ) : academic?.mathAverage2024_2025 != null &&
                        academic?.mathAverage2025_2026 != null
                          ? `${(academic.mathAverage2025_2026 - academic.mathAverage2024_2025) >= 0 ? '+' : ''}${(academic.mathAverage2025_2026 - academic.mathAverage2024_2025).toFixed(1)} pts`
                          : '—'}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

