/**
 * Auto-grade interactive line questions: student picks two integer lattice points;
 * the line must pass through every required point (collinearity on ℤ²).
 */

export type PlottedPoint = { x: number; y: number }

/** Parse the first two (x,y) pairs from free text or plotter output. */
export function parseTwoPointsFromFreeText(s: string): PlottedPoint[] | null {
  const matches = [...String(s).matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)]
  if (matches.length < 2) return null
  return matches.slice(0, 2).map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
}

function colinearInt(a: PlottedPoint, b: PlottedPoint, c: PlottedPoint): boolean {
  return (b.x - a.x) * (c.y - a.y) === (b.y - a.y) * (c.x - a.x)
}

export function interactiveLineThroughPoints(
  freeText: string,
  passThrough: PlottedPoint[],
): boolean {
  const pts = parseTwoPointsFromFreeText(freeText)
  if (!pts || pts.length < 2) return false
  const [p1, p2] = pts
  if (p1.x === p2.x && p1.y === p2.y) return false
  return passThrough.every((r) => colinearInt(p1, p2, r))
}
