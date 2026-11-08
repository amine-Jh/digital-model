import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { findDuplicateKeys, mapImportRows, parseCsv, type ExternalImportRow } from '@/lib/assessment/csv-external'

type LooseInsert = {
  from: (table: string) => {
    insert: (value: unknown) => {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    } & Promise<{ error: { message: string; code?: string } | null }>
    select: (cols: string) => {
      in: (col: string, values: string[]) => Promise<{ data: { id: string }[] | null; error: { message: string } | null }>
    }
  }
}

function issuesForUnknownStudents(rows: ExternalImportRow[], known: Set<string>) {
  return rows
    .filter((row) => row.studentId && !known.has(row.studentId))
    .map((row) => ({ line: row.line, message: `Student_ID inconnu : ${row.studentId}` }))
}

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if ('response' in gate) return gate.response
  const body = await request.json()
  const mode = body.mode === 'confirm' ? 'confirm' : 'preview'
  const { rows } = parseCsv(String(body.csv ?? ''))
  const mapped = mapImportRows(rows)
  const issues = [...mapped.issues, ...findDuplicateKeys(mapped.parsed)]
  const ids = [...new Set(mapped.parsed.map((row) => row.studentId).filter(Boolean))]
  const { data: profiles } = ids.length
    ? await gate.sb.from('profiles').select('id').in('id', ids)
    : { data: [] as { id: string }[] }
  const known = new Set((profiles ?? []).map((row) => row.id))
  issues.push(...issuesForUnknownStudents(mapped.parsed, known))

  if (mode === 'preview' || issues.length > 0) {
    return NextResponse.json({
      ok: issues.length === 0,
      mode,
      rowCount: mapped.parsed.length,
      issues,
      preview: mapped.parsed.slice(0, 20),
    })
  }

  const loose = gate.sb as unknown as LooseInsert
  const batch = await loose
    .from('import_batches')
    .insert({ file_name: String(body.fileName ?? 'import.csv'), imported_by: gate.user.id, row_count: mapped.parsed.length })
    .select('id')
    .single()
  const batchId = batch.data?.id
  if (batch.error || !batchId) {
    return NextResponse.json(
      { error: batch.error?.message ?? 'La table d’import n’existe pas encore. Appliquez la migration 0010.' },
      { status: 400 },
    )
  }

  const payload = mapped.parsed.map((row) => ({
    student_id: row.studentId,
    test_id: row.testId,
    domain: row.domain,
    capacity: row.capacity,
    raw_score: row.rawScore,
    max_score: row.maxScore,
    normalized_score: row.normalizedScore,
    assessed_on: row.assessedOn,
    duration_ms: row.durationMs,
    platform: row.platform || null,
    attempt_id: row.attemptId || `line-${row.line}`,
    source: 'external',
    validation_status: 'validated',
    batch_id: batchId,
  }))
  const inserted = await loose.from('external_results').insert(payload)
  if (inserted.error) {
    const duplicate = inserted.error.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'Un résultat identique existe déjà. Aucune ligne n’a été écrasée.' : inserted.error.message },
      { status: duplicate ? 409 : 400 },
    )
  }
  return NextResponse.json({ ok: true, mode: 'confirm', imported: payload.length, batchId })
}
