/**
 * Questions excluded from score, global mean, and capacity aggregates
 * for geometry cognition lessons (auto-évaluations, diagnostics, saisies manuelles).
 */

export type GeometryScoringShape = {
  id?: string
  part?: string
  question?: string
  correctAnswer?: number | number[] | null
  isDiagnostic?: boolean
  isAutoeval?: boolean
  isOpenEnded?: boolean
  interactiveLine?: unknown
  pointPlacement?: unknown
  fillIn?: unknown
  isDiagnosticQuestion?: boolean
}

/** True = never count toward score, mean, or Cₖ aggregates. */
export function isExcludedFromGeometryScoreAndAverage(
  q: GeometryScoringShape | null | undefined,
): boolean {
  if (!q || typeof q !== 'object') return true
  if (q.isAutoeval === true) return true
  if (q.isDiagnostic === true) return true
  if (q.isDiagnosticQuestion === true) return true
  if (q.isOpenEnded === true) return true
  if (q.interactiveLine != null) {
    const il = q.interactiveLine as { graded?: boolean } | null
    if (!il?.graded) return true
  }
  if (q.pointPlacement != null) {
    const exp = (q as { placementExpected?: unknown }).placementExpected
    if (Array.isArray(exp) && exp.length > 0) return false
    return true
  }
  if (q.fillIn != null) {
    if ((q as { fillGraded?: boolean }).fillGraded === true) return false
    return true
  }

  const id = String(q.id ?? '')
  if (id === 'M1' || id.startsWith('AE') || id.startsWith('AutoEval')) return true

  const part = String(q.part ?? '')
  if (
    part === 'autoeval' ||
    part === 'autoeval2' ||
    part === 'autoeval3' ||
    part === 'preQuestion'
  ) {
    return true
  }

  const raw = String(q.question ?? '').trim()
  const norm = raw.replace(/^\s*mesure\s+\d+\s*[—-]\s*/i, '').trim()
  if (/^est-ce que\b/i.test(norm)) return true

  return false
}
