'use client'

import { useEffect, useMemo, useState } from 'react'

type ScoreCell = { earned: number | null; max: number | null; percent: number | null }
type Student = {
  studentId: string
  firstName: string
  lastName: string
  level: string | null
  className: string | null
  teacher: string | null
  school: string | null
  year: string | null
  supervisedScore: number | null
  supervisedMax: number | null
  previousAverage: number | null
  cka: Record<string, { global: ScoreCell; capacities: Record<string, ScoreCell>; parts: Record<string, ScoreCell> }>
  other: Record<string, ScoreCell & { source: string | null }>
}
type CkaTest = { id: string; name: string; capacities: { code: string; label: string }[]; parts: { key: string; label: string }[] }
type OtherTest = { id: string; name: string; domainName: string; mode: string }

function show(cell: ScoreCell | undefined): string {
  if (!cell || (cell.earned == null && cell.max == null && cell.percent == null)) return ''
  const ratio = cell.earned != null && cell.max != null ? `${cell.earned}/${cell.max}` : ''
  const percent = cell.percent != null ? `${Math.round(cell.percent * 10) / 10}%` : ''
  return [ratio, percent].filter(Boolean).join(' · ')
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function download(filename: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function AggregatedPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [ckaTests, setCkaTests] = useState<CkaTest[]>([])
  const [otherTests, setOtherTests] = useState<OtherTest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [school, setSchool] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/aggregated-matrix')
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Chargement impossible')
        if (!cancelled) {
          setStudents(body.students ?? [])
          setCkaTests(body.ckaTests ?? [])
          setOtherTests(body.otherTests ?? [])
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const levels = useMemo(() => [...new Set(students.map((s) => s.level).filter(Boolean))] as string[], [students])
  const schools = useMemo(() => [...new Set(students.map((s) => s.school).filter(Boolean))] as string[], [students])
  const visible = students.filter((student) => {
    const text = `${student.studentId} ${student.firstName} ${student.lastName}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (level && student.level !== level) return false
    if (school && student.school !== school) return false
    return true
  })

  function identity(student: Student) {
    return [
      student.studentId,
      student.lastName,
      student.firstName,
      student.level ?? '',
      student.className ?? '',
      student.teacher ?? '',
      student.school ?? '',
      student.year ?? '',
      student.supervisedScore ?? '',
      student.supervisedMax ?? '',
      student.previousAverage ?? '',
    ]
  }

  function exportCka() {
    const headers = ['Student_ID', 'Nom', 'Prénom', 'Niveau', 'Classe', 'Enseignant', 'Établissement', 'Année', 'Devoir', 'Devoir max', 'Moyenne S2']
    for (const test of ckaTests) {
      headers.push(`${test.name} obtenu`, `${test.name} max`, `${test.name} %`)
      for (const capacity of test.capacities) headers.push(`${test.name} ${capacity.code} ${capacity.label}`)
      for (const part of test.parts) headers.push(`${test.name} ${part.label}`)
    }
    const rows = visible.map((student) => {
      const line: unknown[] = identity(student)
      for (const test of ckaTests) {
        const score = student.cka[test.id]
        line.push(score?.global.earned ?? '', score?.global.max ?? '', score?.global.percent ?? '')
        for (const capacity of test.capacities) line.push(show(score?.capacities[capacity.code]))
        for (const part of test.parts) line.push(show(score?.parts[part.key]))
      }
      return line
    })
    download('resultats-cka.csv', [headers, ...rows])
  }

  function exportOther() {
    const headers = ['Student_ID', 'Nom', 'Prénom', 'Niveau', 'Classe', 'Enseignant', 'Établissement', 'Année', 'Devoir', 'Devoir max', 'Moyenne S2', ...otherTests.map((test) => `${test.name} (${test.mode})`)]
    const rows = visible.map((student) => [...identity(student), ...otherTests.map((test) => show(student.other[test.id]))])
    download('resultats-autres-domaines.csv', [headers, ...rows])
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Résultats agrégés</h1>
        <p className="mt-1 text-sm text-slate-500">
          Deux tableaux distincts. Une cellule vide signifie qu&apos;il n&apos;y a pas de résultat, pas un zéro.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <input className="rounded border px-3 py-1.5 text-sm" placeholder="Student_ID, nom ou prénom" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded border px-2 py-1.5 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Tous les niveaux</option>
          {levels.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="rounded border px-2 py-1.5 text-sm" value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">Tous les établissements</option>
          {schools.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">1. Cognition et apprentissage de la géométrie</h2>
          <button type="button" className="text-sm text-indigo-700 underline" onClick={exportCka}>Exporter Excel (CSV)</button>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded border">
          <table className="min-w-max border-collapse text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500">
                {['Student_ID', 'Nom', 'Prénom', 'Niveau', 'Classe', 'Enseignant', 'Établissement', 'Année'].map((label) => (
                  <th key={label} className="sticky left-0 bg-white px-2 py-2">{label}</th>
                ))}
                {ckaTests.flatMap((test) => [
                  <th key={`${test.id}-g`} className="px-2 py-2">{test.name} — global</th>,
                  ...test.capacities.map((capacity) => (
                    <th key={`${test.id}-${capacity.code}`} className="px-2 py-2" title={capacity.label}>{test.name} — {capacity.code}</th>
                  )),
                  ...test.parts.map((part) => (
                    <th key={`${test.id}-p${part.key}`} className="px-2 py-2">{test.name} — {part.label}</th>
                  )),
                ])}
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.studentId} className="border-t">
                  <td className="px-2 py-1 font-mono">{student.studentId}</td>
                  <td className="px-2 py-1">{student.lastName}</td>
                  <td className="px-2 py-1">{student.firstName}</td>
                  <td className="px-2 py-1">{student.level ?? ''}</td>
                  <td className="px-2 py-1">{student.className ?? ''}</td>
                  <td className="px-2 py-1">{student.teacher ?? ''}</td>
                  <td className="px-2 py-1">{student.school ?? ''}</td>
                  <td className="px-2 py-1">{student.year ?? ''}</td>
                  {ckaTests.flatMap((test) => {
                    const score = student.cka[test.id]
                    return [
                      <td key={`${student.studentId}-${test.id}-g`} className="px-2 py-1">{show(score?.global)}</td>,
                      ...test.capacities.map((capacity) => (
                        <td key={`${student.studentId}-${test.id}-${capacity.code}`} className="px-2 py-1">{show(score?.capacities[capacity.code])}</td>
                      )),
                      ...test.parts.map((part) => (
                        <td key={`${student.studentId}-${test.id}-p${part.key}`} className="px-2 py-1">{show(score?.parts[part.key])}</td>
                      )),
                    ]
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">2. Autres domaines</h2>
          <button type="button" className="text-sm text-indigo-700 underline" onClick={exportOther}>Exporter Excel (CSV)</button>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded border">
          <table className="min-w-max border-collapse text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-slate-500">
                {['Student_ID', 'Nom', 'Prénom', 'Niveau', 'Classe', 'Enseignant', 'Établissement', 'Année'].map((label) => (
                  <th key={label} className="px-2 py-2">{label}</th>
                ))}
                {otherTests.map((test) => (
                  <th key={test.id} className="px-2 py-2">{test.name}<div className="font-normal text-slate-400">{test.mode === 'external' ? 'Externe' : 'Interne'}</div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.studentId} className="border-t">
                  <td className="px-2 py-1 font-mono">{student.studentId}</td>
                  <td className="px-2 py-1">{student.lastName}</td>
                  <td className="px-2 py-1">{student.firstName}</td>
                  <td className="px-2 py-1">{student.level ?? ''}</td>
                  <td className="px-2 py-1">{student.className ?? ''}</td>
                  <td className="px-2 py-1">{student.teacher ?? ''}</td>
                  <td className="px-2 py-1">{student.school ?? ''}</td>
                  <td className="px-2 py-1">{student.year ?? ''}</td>
                  {otherTests.map((test) => (
                    <td key={test.id} className="px-2 py-1">{show(student.other[test.id])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
