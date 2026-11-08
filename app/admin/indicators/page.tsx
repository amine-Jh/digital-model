'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Triangle } from 'lucide-react'

type Row = {
  studentId: string
  name: string | null
  school: string | null
  level: string | null
  track: string | null
  teacher: string | null
  internalCount: number
  externalCount: number
  internalAverage: number | null
  externalAverage: number | null
  comparableAverage: number | null
}

function cell(value: number | null) {
  return value == null ? 'Non disponible' : `${value}%`
}

export default function IndicatorsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [questions, setQuestions] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)
  const [externalReady, setExternalReady] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/geometry-overview')
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Chargement impossible')
        if (!cancelled) {
          setRows(body.students ?? [])
          setQuestions(body.questions ?? [])
          setExternalReady(body.externalReady !== false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Triangle className="w-6 h-6 text-indigo-600" />
            Résultats — géométrie
          </h1>
          <p className="text-slate-500 mt-1">
            Tous les élèves. Les moyennes interne et externe ne sont pas mélangées. Une absence de score n’est pas un zéro.
          </p>
        </div>
        <a className="text-sm font-medium text-indigo-700 underline" href="/api/admin/exports">
          Télécharger Excel (CSV)
        </a>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!externalReady && (
        <p className="text-sm text-amber-700">
          Les résultats externes ne sont pas encore disponibles. Appliquez la migration `0010_central_geometry_results.sql`.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tableau 1 — identité et niveau scolaire</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Student_ID</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Établissement</th>
                <th className="py-2 pr-3">Niveau</th>
                <th className="py-2 pr-3">Filière</th>
                <th className="py-2">Enseignant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{row.studentId}</td>
                  <td className="py-2 pr-3">{row.name ?? '—'}</td>
                  <td className="py-2 pr-3">{row.school ?? '—'}</td>
                  <td className="py-2 pr-3">{row.level ?? '—'}</td>
                  <td className="py-2 pr-3">{row.track ?? '—'}</td>
                  <td className="py-2">{row.teacher ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tableau 2 — scores internes, externes et comparaison</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Élève</th>
                <th className="py-2 pr-3">Tests internes</th>
                <th className="py-2 pr-3">Moyenne interne</th>
                <th className="py-2 pr-3">Résultats externes</th>
                <th className="py-2 pr-3">Moyenne externe</th>
                <th className="py-2">Moyenne comparable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{row.name ?? row.studentId}</td>
                  <td className="py-2 pr-3">{row.internalCount}</td>
                  <td className="py-2 pr-3">{cell(row.internalAverage)}</td>
                  <td className="py-2 pr-3">{row.externalCount}</td>
                  <td className="py-2 pr-3">{cell(row.externalAverage)}</td>
                  <td className="py-2">{cell(row.comparableAverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Résultats par question — tests internes de géométrie</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Élève</th>
                <th className="py-2 pr-3">Test</th>
                <th className="py-2 pr-3">Question</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Réponse attendue</th>
                <th className="py-2">Réponse donnée</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{String(row.name ?? row.studentId ?? '')}</td>
                  <td className="py-2 pr-3">{String(row.testId ?? '')}</td>
                  <td className="py-2 pr-3">{String(row.questionId ?? '')}</td>
                  <td className="py-2 pr-3">{row.score == null ? 'Non disponible' : String(row.score)}</td>
                  <td className="py-2 pr-3">{String(row.expected ?? '')}</td>
                  <td className="py-2">{JSON.stringify(row.selected ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
