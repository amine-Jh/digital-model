import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET() {
  const gate = await requireAdmin()
  if ('response' in gate) return gate.response
  const self = await (await import('@/app/api/admin/geometry-overview/route')).GET()
  const body = await self.json()
  const students = (body.students ?? []) as Record<string, unknown>[]
  const headers = [
    'student_id',
    'name',
    'school',
    'level',
    'track',
    'internal_count',
    'internal_average_percent',
    'external_count',
    'external_average_percent',
    'comparable_average_percent',
  ]
  const lines = [
    headers.join(','),
    ...students.map((row) =>
      [
        row.studentId,
        row.name,
        row.school,
        row.level,
        row.track,
        row.internalCount,
        row.internalAverage,
        row.externalCount,
        row.externalAverage,
        row.comparableAverage,
      ].map(csvCell).join(','),
    ),
  ]
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="geometry-results.csv"',
    },
  })
}
