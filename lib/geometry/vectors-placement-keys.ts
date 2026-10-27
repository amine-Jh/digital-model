/**
 * Server-only correction keys for sequential placements (Q10, Q11).
 * Do not import this module from client components.
 */

export type SequentialPlacementKey = { name: string; x: number; y: number }

export const VECTORS_SEQUENTIAL_PLACEMENT_KEYS: Record<string, SequentialPlacementKey[]> = {
  Q10: [
    { name: 'Q', x: 7, y: -3 },
    { name: 'M', x: 7, y: 0 },
  ],
  Q11: [
    { name: 'P', x: 6, y: -1 },
    { name: 'N', x: 3, y: -3 },
  ],
}

export type SequentialPlacementCheck = {
  name: string
  chosen: { x: number; y: number }
  expected: { x: number; y: number }
  correct: boolean
  score: number
  nextName: string | null
  pointIndex: number
  pointCount: number
}

export function checkVectorsSequentialPlacement(input: {
  questionId: string
  name: string
  x: number
  y: number
}): SequentialPlacementCheck | null {
  const keys = VECTORS_SEQUENTIAL_PLACEMENT_KEYS[input.questionId]
  if (!keys?.length) return null
  const pointIndex = keys.findIndex((k) => k.name === input.name)
  if (pointIndex < 0) return null
  const expected = keys[pointIndex]
  const x = Math.round(Number(input.x))
  const y = Math.round(Number(input.y))
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const correct = x === expected.x && y === expected.y
  const next = keys[pointIndex + 1]
  return {
    name: expected.name,
    chosen: { x, y },
    expected: { x: expected.x, y: expected.y },
    correct,
    score: correct ? 1 : 0,
    nextName: next?.name ?? null,
    pointIndex,
    pointCount: keys.length,
  }
}

export function scoreSequentialPlacementOutcomes(
  outcomes: { score: number }[],
  expectedCount: number,
): number {
  if (expectedCount <= 0) return 0
  const earned = outcomes.reduce((s, o) => s + (o.score === 1 ? 1 : 0), 0)
  return earned / expectedCount
}
