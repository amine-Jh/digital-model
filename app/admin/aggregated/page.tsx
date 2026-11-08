'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { platformDomains } from '@/lib/platform-domains'
import { cn } from '@/lib/utils'
import {
  fetchAdminResultsData,
  domainAverageForAdminStudent,
  avgDefined,
  type AdminStudentSummary,
} from '@/lib/admin-results'

function color(v: number | null) {
  if (v == null) return 'text-slate-400'
  if (v >= 75) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function pct(v: number | null) {
  return v == null ? 'Non disponible' : `${v}%`
}

function PctBar({ v }: { v: number | null }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden w-full">
      {v != null && (
        <div
          className={cn(
            'h-full',
            v >= 75 ? 'bg-green-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-400',
          )}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      )}
    </div>
  )
}

export default function AggregatedPage() {
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAdminResultsData()
      .then(({ students: rows, error }) => {
        if (cancelled) return
        if (error) setLoadError(error)
        else setLoadError(null)
        setStudents(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byTeacher = useMemo(() => {
    const m = new Map<string, AdminStudentSummary[]>()
    for (const s of students) {
      const k = s.groupId
      const arr = m.get(k) ?? []
      arr.push(s)
      m.set(k, arr)
    }
    return [...m.entries()].map(([groupId, group]) => {
      const domainAvgs = platformDomains.map((d) =>
        avgDefined(group.map((st) => domainAverageForAdminStudent(st, d.id))),
      )
      return {
        groupId,
        name: group[0]?.teacherName ?? 'Sans enseignant référent',
        studentCount: group.length,
        domains: platformDomains.map((d, i) => ({
          id: d.id,
          name: d.name,
          avg: domainAvgs[i] ?? null,
        })),
        overall: avgDefined(domainAvgs),
      }
    })
  }, [students])

  const byFiliere = useMemo(() => {
    const filieres = [...new Set(students.map((s) => s.filiere))]
    return filieres.map((f) => ({
      filiere: f,
      avg: avgDefined(
        students
          .filter((s) => s.filiere === f)
          .flatMap((s) => platformDomains.map((d) => domainAverageForAdminStudent(s, d.id))),
      ),
    }))
  }, [students])

  const byLevel = useMemo(() => {
    const levels = [...new Set(students.map((s) => s.level))]
    return levels.map((lv) => ({
      level: lv,
      avg: avgDefined(
        students
          .filter((s) => s.level === lv)
          .flatMap((s) => platformDomains.map((d) => domainAverageForAdminStudent(s, d.id))),
      ),
    }))
  }, [students])

  const byInst = useMemo(() => {
    const insts = [...new Set(students.map((s) => s.institutionId))]
    return insts.map((name) => ({
      name,
      avg: avgDefined(
        students
          .filter((s) => s.institutionId === name)
          .flatMap((s) => platformDomains.map((d) => domainAverageForAdminStudent(s, d.id))),
      ),
    }))
  }, [students])

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Résultats agrégés</h1>
        <p className="text-slate-500 mt-1">
          Moyennes calculées depuis `test_sessions` (dernière session par test), groupées par
          enseignant référent (`student_profiles.teacher_id`).
        </p>
      </div>

      {loadError && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Par enseignant référent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {byTeacher.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée agrégée (pas d&apos;élèves ou pas de sessions).</p>
          ) : (
            byTeacher.map((t) => (
              <div key={t.groupId} className="space-y-2 pb-4 border-b border-slate-100 last:border-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.studentCount} élève(s)</p>
                  </div>
                  <span className={cn('text-xl font-bold tabular-nums', color(t.overall))}>
                    {pct(t.overall)}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {t.domains.map((d) => (
                    <div key={d.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate pr-2">{d.name}</span>
                        <span className={cn('font-bold tabular-nums', color(d.avg))}>{pct(d.avg)}</span>
                      </div>
                      <PctBar v={d.avg} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Par filière</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byFiliere.map((f) => (
              <div key={f.filiere}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{f.filiere}</span>
                  <span className={cn('font-bold tabular-nums', color(f.avg))}>{pct(f.avg)}</span>
                </div>
                <PctBar v={f.avg} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Par niveau scolaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byLevel.map((x) => (
              <div key={x.level}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{x.level}</span>
                  <span className={cn('font-bold tabular-nums', color(x.avg))}>{pct(x.avg)}</span>
                </div>
                <PctBar v={x.avg} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Par établissement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byInst.map((x) => (
              <div key={x.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{x.name}</span>
                  <span className={cn('font-bold tabular-nums', color(x.avg))}>{pct(x.avg)}</span>
                </div>
                <PctBar v={x.avg} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
