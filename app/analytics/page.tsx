'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { isAdminAreaRole } from '@/lib/auth-types'
import { mockInstitutions } from '@/lib/mock-groups'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { placeholderFit } from '@/lib/sem-model'
import { buildRecommendations } from '@/lib/recommendations-engine'
import { ChartAreaSkeleton } from '@/components/ui/value-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import { listMyStudentsView, listSessionsForStudentIds } from '@/lib/results/results-service'
import { classDomainAveragesFromSessions } from '@/lib/teacher-cohort-stats'
import type { Database } from '@/lib/types/database'

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

const radarDemo = [
  { domain: 'Attention', score: 72 },
  { domain: 'Reasoning', score: 68 },
  { domain: 'Spatial', score: 75 },
  { domain: 'Visual', score: 70 },
  { domain: 'Memory', score: 65 },
  { domain: 'Executive', score: 73 },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { catalog } = useTestsCatalog()
  const isMobile = useIsMobile()
  const [instFilter, setInstFilter] = useState(mockInstitutions[0]?.id ?? '')
  const [cohortSessions, setCohortSessions] = useState<SessionRow[]>([])
  const [cohortLoading, setCohortLoading] = useState(false)
  const [cohortError, setCohortError] = useState<string | null>(null)

  const useDemoAnalytics = user ? user.role !== 'teacher' : true

  const teacherDomainProfile = useMemo(() => {
    const rows = classDomainAveragesFromSessions(catalog, cohortSessions)
    return rows.map((r) => ({ domain: r.domain, score: r.avgScore }))
  }, [catalog, cohortSessions])

  const chartData = useDemoAnalytics ? radarDemo : teacherDomainProfile

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'teacher' && !isAdminAreaRole(user.role)))) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user || useDemoAnalytics) return
    let cancelled = false
    setCohortLoading(true)
    setCohortError(null)
    ;(async () => {
      try {
        const rosterRes = await listMyStudentsView()
        if (cancelled) return
        const ids = (rosterRes.data ?? []).map((r) => r.user_id)
        const sessRes = await listSessionsForStudentIds(ids, { limit: 2000 })
        if (cancelled) return
        const err = rosterRes.error ?? sessRes.error
        if (err) setCohortError(err)
        setCohortSessions(sessRes.data ?? [])
      } catch {
        if (!cancelled) setCohortError('Could not load cohort sessions.')
      } finally {
        if (!cancelled) setCohortLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, useDemoAnalytics])

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Sidebar userRole="teacher" />
        <div className={cn('transition-all duration-200', isMobile ? 'ml-0' : 'ml-64')}>
          <Header
            title="Analytique & aide à la décision"
            subtitle="Filtres : établissement, niveau, filière (données de démonstration)"
          />
          <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-10 w-[220px] rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-48 rounded" />
                </CardHeader>
                <CardContent>
                  <ChartAreaSkeleton height={280} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-56 rounded" />
                  <Skeleton className="h-3 w-full max-w-md rounded mt-2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-36 rounded" />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48 rounded" />
              </CardHeader>
              <CardContent>
                <ChartAreaSkeleton height={240} />
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
        <p className="text-muted-foreground text-sm text-center max-w-sm">Connexion requise.</p>
      </div>
    )
  }

  const fit = placeholderFit()

  const recParams = useMemo(() => {
    if (useDemoAnalytics || teacherDomainProfile.length === 0) {
      return { weakestDomain: 'Memory', strongestDomain: 'Spatial', competencyScore: 62 }
    }
    const sorted = [...teacherDomainProfile].sort((a, b) => a.score - b.score)
    const weakest = sorted[0]?.domain ?? '—'
    const strongest = sorted[sorted.length - 1]?.domain ?? '—'
    const competencyScore = Math.round(
      teacherDomainProfile.reduce((s, r) => s + r.score, 0) / teacherDomainProfile.length,
    )
    return { weakestDomain: weakest, strongestDomain: strongest, competencyScore }
  }, [useDemoAnalytics, teacherDomainProfile])

  const recs = buildRecommendations(recParams)

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole={isAdminAreaRole(user.role) ? 'admin' : 'teacher'} userName={user.username} />
      <div className={cn("transition-all duration-200", isMobile ? "ml-0" : "ml-64")}>
        <Header
          title="Analytique & aide à la décision"
          subtitle={
            useDemoAnalytics
              ? 'Vue démonstration (admin) — les enseignants voient uniquement leur cohorte RLS'
              : 'Cohorte : sessions visibles pour votre compte enseignant (élèves rattachés)'
          }
        />
        <main className="p-4 md:p-6 pt-24 max-w-7xl space-y-6">
          {cohortError && !useDemoAnalytics && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {cohortError}
            </p>
          )}
          {useDemoAnalytics && (
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Institution (démo)</Label>
                <Select value={instFilter} onValueChange={setInstFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockInstitutions.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Domain profile (cohort)</CardTitle>
                <CardDescription>
                  {useDemoAnalytics ? 'Données fictives' : 'Moyennes par domaine (sessions terminées)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!useDemoAnalytics && cohortLoading ? (
                  <ChartAreaSkeleton height={280} />
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    {useDemoAnalytics ? 'Aucune donnée.' : 'Pas encore de scores par domaine.'}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="domain" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar dataKey="score" stroke="#1e3a8a" fill="#1e3a8a" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>SEM fit indices (placeholder)</CardTitle>
                <CardDescription>Replace with estimates from your calibration sample</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>RMSEA: {fit.rmsea}</p>
                <p>CFI: {fit.cfi}</p>
                <p>TLI: {fit.tli}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aggregated performance</CardTitle>
              <CardDescription>
                {useDemoAnalytics ? 'Démo' : 'Même agrégat que le profil radar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!useDemoAnalytics && cohortLoading ? (
                <ChartAreaSkeleton height={240} />
              ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Aucune donnée.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="domain" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intelligent recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recs.map((r, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">
                    [{r.audience}] {r.title}
                  </p>
                  <p className="text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
