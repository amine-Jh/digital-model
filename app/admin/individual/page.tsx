'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { platformDomains, geometryCognitionTestIds } from '@/lib/platform-domains'
import { CAPACITIES_BY_TEST } from '@/lib/geometry/capacity-definitions'
import { cn } from '@/lib/utils'
import {
  fetchAdminResultsData,
  domainAverageForAdminStudent,
  type AdminStudentSummary,
} from '@/lib/admin-results'
import { formatCapacityGlyph } from '@/lib/geometry/capacity-definitions'
import { asciiCompetencyKey } from '@/lib/geometry-mcq'

function color(v: number) {
  if (v < 0) return 'text-slate-500'
  if (v >= 75) return 'text-green-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-500'
}

const allTests = Array.from(
  new Map(
    platformDomains.flatMap((d) =>
      d.subdomains.flatMap((s) =>
        s.capacities.map((c) => [c.testId, { testId: c.testId, name: c.nameFr ?? c.name }] as const),
      ),
    ),
  ).values(),
)

const geometryTestIdSet = new Set(geometryCognitionTestIds())

export default function IndividualResultsPage() {
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAdminResultsData()
      .then(({ students: rows, error }) => {
        if (cancelled) return
        if (error) setLoadError(error)
        else setLoadError(null)
        setStudents(rows)
        setSelected((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev
          return rows[0]?.id ?? null
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
  const student = students.find((s) => s.id === selected) ?? students[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Résultats individuels</h1>
        <p className="text-slate-500 mt-1">
          Données Supabase (profils élèves + sessions). Student → Tests → Scores.
        </p>
      </div>

      {loadError && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <div className="grid md:grid-cols-[320px_1fr] gap-4">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Élèves ({students.length})</CardTitle>
              <Input
                placeholder="Rechercher…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="max-h-[520px] overflow-y-auto space-y-1 px-2">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    s.id === student?.id ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100',
                  )}
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.filiere} · {s.level}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-slate-500 px-2">Aucun élève trouvé.</p>
              )}
            </CardContent>
          </Card>

          {student && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{student.name}</CardTitle>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{student.filiere}</Badge>
                    <Badge variant="outline">{student.level}</Badge>
                    <Badge variant="outline">{student.teacherName}</Badge>
                    <Badge variant="outline">{student.institutionId}</Badge>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Moyennes par domaine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {platformDomains.map((d) => {
                    const v = domainAverageForAdminStudent(student, d.id)
                    return (
                      <div key={d.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate pr-2">{d.name}</span>
                          <span className={cn('font-bold tabular-nums', color(v))}>{v}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scores par test</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {allTests.map((t) => {
                      const v = student.testScores[t.testId]
                      const display = v != null && v >= 0 ? v : v === -1 ? -1 : 0
                      const cap = student.capacityByTest?.[t.testId]
                      return (
                        <div
                          key={t.testId}
                          className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm"
                        >
                          <div className="flex justify-between gap-2 border-b border-slate-50 pb-1.5">
                            <span className="truncate pr-2 font-medium text-slate-800">
                              {t.name}
                            </span>
                            <span className={cn('shrink-0 font-bold tabular-nums', color(display))}>
                              {v === -1
                                ? 'Attente validation'
                                : v != null
                                  ? `${v}%`
                                  : '—'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Leçon · {t.testId}
                          </p>
                          {cap ? (
                            <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2 text-[11px]">
                              <p className="font-semibold text-slate-600">Détail par Cₖ</p>
                              {Object.entries(cap.breakdown)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([code, br]) => {
                                  const defs = CAPACITIES_BY_TEST[t.testId]
                                  const ascii = asciiCompetencyKey(code)
                                  const label = defs?.find((d) => d.code === ascii)?.label
                                  const pct =
                                    br.percent ??
                                    (br.max > 0 ? Math.round((br.earned / br.max) * 100) : 0)
                                  return (
                                    <div
                                      key={code}
                                      className="border-b border-slate-100 py-1 last:border-0"
                                    >
                                      <div className="flex justify-between gap-2">
                                        <span className="font-mono text-slate-700">
                                          {formatCapacityGlyph(code)}
                                        </span>
                                        <span className="tabular-nums text-slate-800">
                                          {cap.unit === 'points'
                                            ? `${br.earned} / ${br.max} pts`
                                            : `${pct}%`}
                                        </span>
                                      </div>
                                      {label ? (
                                        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                                          {label}
                                        </p>
                                      ) : null}
                                    </div>
                                  )
                                })}
                            </div>
                          ) : geometryTestIdSet.has(t.testId) ? (
                            <p className="mt-2 text-[11px] text-slate-400">
                              Pas de ventilation Cₖ enregistrée (session antérieure ou autre type de
                              test).
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
