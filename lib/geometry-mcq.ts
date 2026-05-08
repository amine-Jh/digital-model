import type { Question } from '@/lib/mock-data'

export const GEOMETRY_COGNITION_DOMAIN = 'Cognition et apprentissage de la géométrie'

const EXCLUSIVE_NORMALIZED = new Set([
  'je sais pas',
  "j'ai oublié",
  'j’ai oublié',
  'aucune réponse',
])

export function normalizeMcqOptionLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isExclusiveMcqOption(option: string): boolean {
  return EXCLUSIVE_NORMALIZED.has(normalizeMcqOptionLabel(option))
}

export function correctOptionIndicesForQuestion(q: Question): number[] {
  if (q.correctOptionIndices?.length) return [...q.correctOptionIndices]
  if (q.correctOptionIndex != null) return [q.correctOptionIndex]
  return []
}

/** Selected option texts → correct if matches exact set of correct indices (order-free). */
export function isGeometryMcqCorrect(q: Question, selectedLabels: string[]): boolean {
  const options = q.options ?? []
  if (selectedLabels.length === 0) return false
  const exclusiveSel = selectedLabels.filter(isExclusiveMcqOption)
  if (exclusiveSel.length > 0) return false
  const correctIdx = correctOptionIndicesForQuestion(q)
  if (correctIdx.length === 0) return false
  const selIdx = selectedLabels
    .map((label) => options.indexOf(label))
    .filter((i) => i >= 0)
  const a = [...new Set(selIdx)].sort((x, y) => x - y)
  const b = [...correctIdx].sort((x, y) => x - y)
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/** Map C₁…C₅ style codes to canonical C1 for analytics keys. */
export function asciiCompetencyKey(code: string): string {
  const sub = '₁₂₃₄₅₆₇₈₉'
  let s = code.trim()
  for (let i = 0; i < sub.length; i++) {
    if (s.includes(sub[i]!)) {
      s = s.replace(sub[i]!, String(i + 1))
    }
  }
  return s
}

export function buildGeometryCapacityBreakdown(
  testId: string,
  questions: Question[],
  perQuestion: { questionId: string; correct: boolean }[],
): Record<string, { earned: number; max: number }> | undefined {
  const byCode = new Map<string, { earned: number; max: number }>()
  for (const q of questions) {
    if (q.type !== 'mcq' || !q.competencyCode) continue
    const code = asciiCompetencyKey(q.competencyCode)
    const cur = byCode.get(code) ?? { earned: 0, max: 0 }
    cur.max += 1
    const pq = perQuestion.find((p) => p.questionId === q.id)
    if (pq?.correct) cur.earned += 1
    byCode.set(code, cur)
  }
  if (byCode.size === 0) return undefined
  return Object.fromEntries(byCode)
}
