'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, LineChart, Line,
} from 'recharts'
import { avg, buildAdminStudents, domainAverageForStudent, mockTeacherGroups } from '@/lib/admin-mock'
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

  const filiereTrend = Array.from(new Set(students.map((s) => s.filiere))).map((f) => {
    const row: Record<string, number | string> = { filiere: f }
    platformDomains.forEach((d) => {
      row[shortNames[d.id] ?? d.name] = avg(students.filter((s) => s.filiere === f).map((s) => domainAverageForStudent(s, d.id)))
    })
    return row
  })

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
        <CardHeader><CardTitle className="text-sm">Tendance par filière</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={filiereTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="filiere" fontSize={11} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {Object.values(shortNames).map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={`hsl(${i * 45}, 70%, 50%)`} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
