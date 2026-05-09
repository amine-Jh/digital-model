/**
 * Canonical "Partie I / II / III" mapping for geometry domain tests
 * (Cognition et apprentissage de la géométrie) — aligns scoring & analytics.
 */

export const GEOMETRY_DOMAIN_LESSON_IDS = [
  'test-geo-central-sym',
  'test-geo-symetrie-axiale',
  'test-geo-vectors-complete',
  'test-geo-space',
  'test-geo-produit-scalaire',
] as const

export type GeometryLessonId = (typeof GEOMETRY_DOMAIN_LESSON_IDS)[number]

export function isGeometryDomainLesson(testId: string): testId is GeometryLessonId {
  return (GEOMETRY_DOMAIN_LESSON_IDS as readonly string[]).includes(testId)
}

export type CanonicalPart = 1 | 2 | 3

type PartQuestionShape = {
  id: string
  number?: number
  part?: string
  typeCode?: number
}

/** Returns null when the question is outside the canonical part scheme. */
export function getCanonicalPartIndex(
  testId: string,
  q: PartQuestionShape,
): CanonicalPart | null {
  switch (testId) {
    case 'test-geo-central-sym': {
      const id = String(q.id ?? '').trim()
      if (id === 'AE1' || id === 'AE2') return 1
      if (id === 'AE3') return 2
      const m = /^Q(\d+)$/.exec(id)
      if (!m) return null
      const n = Number(m[1])
      if (n >= 2 && n <= 8) return 1
      if (n >= 9 && n <= 13) return 2
      if (n >= 14) return 3
      return null
    }
    case 'test-geo-symetrie-axiale': {
      const p = q.part
      if (p === 'preQuestion' || p === 'course' || p === 'autoeval2') return 1
      if (p === 'visualization') return 2
      if (p === 'autoeval3') return 2
      if (p === 'reasoning') return 3
      return null
    }
    case 'test-geo-vectors-complete': {
      const p = q.part
      if (p === 'autoeval' || p === 'course') return 1
      if (p === 'construction' || p === 'autoeval3') return 2
      if (p === 'reasoning') return 3
      return null
    }
    case 'test-geo-space': {
      const p = q.part
      if (p === 'course') return 1
      if (p === 'reasoning') return 2
      return null
    }
    case 'test-geo-produit-scalaire': {
      const n = typeof q.number === 'number' ? q.number : 0
      if (n <= 0) return null
      if (n <= 8) return 1
      if (n <= 16) return 2
      return 3
    }
    default:
      return null
  }
}

const PART_TITLES: Record<string, Record<CanonicalPart, string>> = {
  'test-geo-central-sym': {
    1: 'Partie I — Cours (Q2–Q8) et auto-évaluations',
    2: 'Partie II — Construction et visualisation (Q9–Q13), auto-évaluation',
    3: 'Partie III — Raisonnement (Q14–Q17)',
  },
  'test-geo-symetrie-axiale': {
    1: 'Partie I — Questions du cours (Q1–Q8)',
    2: 'Partie II — Visualisation et construction (Q9–Q15)',
    3: 'Partie III — Raisonnement (Q16–Q18)',
  },
  'test-geo-vectors-complete': {
    1: 'Partie I — Auto-évaluation et cours (Q1–Q7)',
    2: 'Partie II — Construction sur figure (Q8–Q18) et auto-évaluation démonstration',
    3: 'Partie III — Raisonnement (Q19–Q21)',
  },
  'test-geo-space': {
    1: 'Partie I — Cours et visualisation spatiale (Q1–Q18)',
    2: 'Partie II — Raisonnement spatial (Q19–Q21)',
    3: '',
  },
  'test-geo-produit-scalaire': {
    1: 'Partie I — Questions du cours (Q1–Q8)',
    2: 'Partie II — Visualisation et construction (Q9–Q16)',
    3: 'Partie III — Raisonnement (Q17–Q28)',
  },
}

export function canonicalPartLabel(testId: string, part: CanonicalPart): string {
  const row = PART_TITLES[testId]?.[part]
  if (row && row.trim() !== '') return row
  return `Partie ${part}`
}
