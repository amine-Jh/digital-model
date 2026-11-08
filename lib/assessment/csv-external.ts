export type CsvRow = Record<string, string>

export type ExternalImportRow = {
  line: number
  studentId: string
  testId: string
  domain: string
  capacity: string
  rawScore: number | null
  maxScore: number | null
  normalizedScore: number | null
  assessedOn: string | null
  durationMs: number | null
  platform: string
  attemptId: string
  source: string
}

export type RowIssue = { line: number; message: string }

const HEADER_ALIASES: Record<string, string> = {
  student_id: 'studentId',
  studentid: 'studentId',
  test_id: 'testId',
  testid: 'testId',
  domain: 'domain',
  domaine: 'domain',
  capacity: 'capacity',
  capacite: 'capacity',
  capacité: 'capacity',
  raw_score: 'rawScore',
  score: 'rawScore',
  score_brut: 'rawScore',
  max_score: 'maxScore',
  score_maximal: 'maxScore',
  normalized_score: 'normalizedScore',
  score_normalise: 'normalizedScore',
  pourcentage: 'normalizedScore',
  assessed_on: 'assessedOn',
  date: 'assessedOn',
  duration_ms: 'durationMs',
  platform: 'platform',
  plateforme: 'platform',
  attempt_id: 'attemptId',
  source: 'source',
}

function normHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase()
}

/** Minimal CSV splitter that respects double quotes. */
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0]).map(normHeader)
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: CsvRow = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
  return { headers, rows }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function num(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? n : Number.NaN
}

export function mapImportRows(rows: CsvRow[]): { parsed: ExternalImportRow[]; issues: RowIssue[] } {
  const parsed: ExternalImportRow[] = []
  const issues: RowIssue[] = []
  rows.forEach((row, index) => {
    const line = index + 2
    const get = (key: string) => {
      const header = Object.keys(row).find((h) => HEADER_ALIASES[h] === key)
      return header ? row[header] ?? '' : ''
    }
    const studentId = get('studentId')
    const testId = get('testId')
    const domain = get('domain')
    const capacity = get('capacity')
    if (!studentId) issues.push({ line, message: 'Student_ID manquant' })
    if (!testId) issues.push({ line, message: 'Test_ID manquant' })
    if (!domain) issues.push({ line, message: 'Domaine manquant' })
    if (!capacity) issues.push({ line, message: 'Capacité manquante' })
    const raw = num(get('rawScore'))
    const max = num(get('maxScore'))
    const normalized = num(get('normalizedScore'))
    if (Number.isNaN(raw)) issues.push({ line, message: 'Score brut invalide' })
    if (Number.isNaN(max)) issues.push({ line, message: 'Score maximal invalide' })
    if (Number.isNaN(normalized)) issues.push({ line, message: 'Score normalisé invalide' })
    if (typeof raw === 'number' && typeof max === 'number' && (raw < 0 || raw > max || max <= 0)) {
      issues.push({ line, message: 'Score hors barème' })
    }
    if (typeof normalized === 'number' && (normalized < 0 || normalized > 100)) {
      issues.push({ line, message: 'Pourcentage hors de 0 à 100' })
    }
    const duration = num(get('durationMs'))
    parsed.push({
      line,
      studentId,
      testId,
      domain,
      capacity,
      rawScore: typeof raw === 'number' ? raw : null,
      maxScore: typeof max === 'number' ? max : null,
      normalizedScore: typeof normalized === 'number' ? normalized : null,
      assessedOn: get('assessedOn') || null,
      durationMs: typeof duration === 'number' ? duration : null,
      platform: get('platform'),
      attemptId: get('attemptId'),
      source: get('source') || 'external',
    })
  })
  return { parsed, issues }
}

export function findDuplicateKeys(rows: ExternalImportRow[]): RowIssue[] {
  const seen = new Map<string, number>()
  const issues: RowIssue[] = []
  for (const row of rows) {
    const key = [row.studentId, row.testId, row.capacity, row.attemptId || row.assessedOn || ''].join('|')
    const prev = seen.get(key)
    if (prev) issues.push({ line: row.line, message: `Doublon de la ligne ${prev}` })
    else seen.set(key, row.line)
  }
  return issues
}

export const EXTERNAL_CSV_TEMPLATE = [
  'student_id,test_id,domain,capacity,raw_score,max_score,normalized_score,assessed_on,duration_ms,platform,attempt_id,source',
  'STUDENT-UUID,test-example,Traitement visuel,Discrimination visuelle,80,100,80,2026-11-08,,Plateforme externe,attempt-1,external',
].join('\n')
