'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'
import { avg, buildAdminStudents, domainAverageForStudent, mockTeacherGroups } from '@/lib/admin-mock'
import { avgDefined, domainAverageForAdminStudent, fetchAdminResultsData, type AdminStudentSummary } from '@/lib/admin-results'
import { platformDomains } from '@/lib/platform-domains'

const shortNames: Record<string, string> = {
  'attentional-capacities': 'Attention',
  'reasoning-capacities':   'Raisonnement',
  'cognitive-capacity':     'Cap. cognitive',
  'visual-processing':      'Visuel',
  'memory-capacities':      'Mémoire',
  'executive-functions':    'Exécutives',
  'geometry-learning':      'Géométrie',
}

export default function ComparisonPage() {
  const students = useMemo(() => buildAdminStudents(), [])
  const [groupA, setGroupA] = useState(mockTeacherGroups[0]?.id)
  const [groupB, setGroupB] = useState(mockTeacherGroups[1]?.id)

  const perDomain = platformDomains.map((d) => {
    const scores = students.map((s) => domainAverageForStudent(s, d.id))
    return { name: shortNames[d.id] ?? d.name, avg: avg(scores) }
  })

  const radarData = platformDomains.map((d) => {
    const A = students.filter((s) => s.groupId === groupA)
    const B = students.filter((s) => s.groupId === groupB)
    return {
      domain: shortNames[d.id] ?? d.name,
      [mockTeacherGroups.find((g) => g.id === groupA)?.name ?? 'A']: avg(A.map((s) => domainAverageForStudent(s, d.id))),
      [mockTeacherGroups.find((g) => g.id === groupB)?.name ?? 'B']: avg(B.map((s) => domainAverageForStudent(s, d.id))),
    }
  })

  const [realStudents, setRealStudents] = useState<AdminStudentSummary[]>([])
  useEffect(() => {
    let cancelled = false
    fetchAdminResultsData().then(({ students: rows }) => {
      if (!cancelled) setRealStudents(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const levels = useMemo(
    () => [...new Set(realStudents.map((student) => student.level).filter((level) => level && level !== '—'))],
    [realStudents],
  )
  const levelRadar = platformDomains.map((domain) => {
    const row: Record<string, string | number> = { domain: shortNames[domain.id] ?? domain.name }
    for (const schoolLevel of levels) {
      const values = realStudents
        .filter((student) => student.level === schoolLevel)
        .map((student) => domainAverageForAdminStudent(student, domain.id))
      const mean = avgDefined(values)
      if (mean != null) row[schoolLevel] = mean
    }
    return row
  })
  const levelCounts = levels.map((schoolLevel) => ({
    level: schoolLevel,
    n: realStudents.filter((student) => student.level === schoolLevel && platformDomains.some((domain) => domainAverageForAdminStudent(student, domain.id) != null)).length,
  }))

  const A = mockTeacherGroups.find((g) => g.id === groupA)?.name ?? 'A'
  const B = mockTeacherGroups.find((g) => g.id === groupB)?.name ?? 'B'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Comparaison & visualisation</h1>
        <p className="text-slate-500 mt-1">Graphiques à barres, radar et comparatifs par domaine.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Moyennes par domaine — tous élèves</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={perDomain}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comparatif radar — deux groupes</CardTitle>
          <div className="flex gap-2 mt-2">
            <select value={groupA} onChange={(e) => setGroupA(e.target.value)} className="text-sm border rounded px-2 py-1">
              {mockTeacherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <span className="text-slate-400 self-center">vs</span>
            <select value={groupB} onChange={(e) => setGroupB(e.target.value)} className="text-sm border rounded px-2 py-1">
              {mockTeacherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent style={{ height: 360 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="domain" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name={A} dataKey={A} stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              <Radar name={B} dataKey={B} stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comparaison des performances par niveau scolaire — Graphique radar</CardTitle>
          <p className="text-xs text-slate-500">
            Moyennes en pourcentage. Une absence de score n&apos;entre pas dans la moyenne.
            {levelCounts.map((item) => ` ${item.level}: N=${item.n}.`)}
          </p>
        </CardHeader>
        <CardContent style={{ height: 380 }}>
          {levels.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun niveau scolaire n&apos;est encore associé à des élèves.</p>
          ) : (
            <ResponsiveContainer>
              <RadarChart data={levelRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {levels.map((schoolLevel, index) => (
                  <Radar
                    key={schoolLevel}
                    name={schoolLevel}
                    dataKey={schoolLevel}
                    stroke={`hsl(${index * 70}, 70%, 42%)`}
                    fill={`hsl(${index * 70}, 70%, 42%)`}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
