/**
 * Géométrie dans l'espace — Cognitive Assessment Test
 * Domain: Cognition et apprentissage de la géométrie
 *
 * Structure (Canonique — Cognition et apprentissage de la géométrie) :
 *  - Partie I  : Q1 → Q18 — cours et visualisation spatiale (dont M1 diagnostic)
 *  - Partie II : Q19 → Q21 — raisonnement spatial (Q19 en trois items a/b/c)
 *
 * Competencies:
 *  C1: Connaître les axiomes / déterminer un plan
 *  C2: Exprimer les positions relatives (droites / plans)
 *  C3: Utiliser et déduire dans des configurations de référence (cube, tétraèdre…)
 */

export const GEO_SPACE_TEST_ID = 'test-geo-space'
export const GEO_SPACE_RESULTS_KEY = 'geo-space:results'

export interface GeoSpaceQuestion {
  id: string
  competencies: string[]
  question: string
  options: string[]
  /** Single index, array of indices (multi-correct), or null (auto-eval). */
  correctAnswer: number | number[] | null
  requiresImage: boolean
  imagePath?: string | string[]
  part: 'course' | 'reasoning'
}

export interface GeoSpaceTrialResult {
  index: number
  questionId: string
  selected: number
  selectedList?: number[]
  correct: boolean
  /** Per-question score in [0, 1] — supports partial credit. */
  score?: number
  reactionTimeMs: number
}

export interface GeoSpaceResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: GeoSpaceTrialResult[]
  totalMs: number
  correctCount: number
  score: number
}

export const GEO_SPACE_QUESTIONS: GeoSpaceQuestion[] = [
  // ─── Partie I — Questions du cours ───────────────────────────────────────
  // Mesure 1 — diagnostic auto-évaluation (non scorée)
  {
    id: 'M1',
    competencies: [],
    question:
      'Mesure 1 — Est-ce que tu trouves une difficulté dans la reconnaissance des formes géométriques 3D dans l\'espace ?',
    options: ['Oui', 'Non'],
    correctAnswer: null,
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q1',
    competencies: ['C1'],
    question:
      'Par trois points \\( A \\), \\( B \\), \\( C \\) non alignés de l\'espace \\( (E) \\) passe :',
    options: [
      'un plan et un seul, noté \\( (ABC) \\)',
      'deux plans',
      'trois plans différents',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q2',
    competencies: ['C1'],
    question:
      '\\( A \\) et \\( B \\) sont deux points distincts d\'un plan \\( (P) \\) de l\'espace \\( (E) \\). Alors la droite \\( (AB) \\) :',
    options: [
      'est incluse dans le plan \\( (P) \\)',
      'est orthogonale au plan \\( (P) \\)',
      'est parallèle au plan \\( (P) \\)',
    ],
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q3',
    competencies: ['C1'],
    question:
      '\\( (P) \\) et \\( (P\') \\) sont deux plans distincts de l\'espace. Si un point \\( A \\) est commun aux deux plans, alors les deux plans :',
    options: [
      'se coupent suivant une droite passant par le point \\( A \\)',
      'se coupent au point \\( A \\) uniquement',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q4',
    competencies: ['C2'],
    question:
      'Si \\( (D) \\) et \\( (D\') \\) sont parallèles et une droite \\( (\\Delta) \\) est parallèle à l\'une des deux droites, alors :',
    options: [
      '\\( (\\Delta) \\) est parallèle à l\'autre droite',
      '\\( (\\Delta) \\) est perpendiculaire à l\'autre droite',
      '\\( (\\Delta) \\) est sécante avec l\'autre droite',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q5',
    competencies: ['C2'],
    question:
      'Si une droite \\( (\\Delta) \\) est parallèle à chacune des droites \\( (D) \\) et \\( (D\') \\), alors :',
    options: [
      '\\( (D) \\) et \\( (D\') \\) sont parallèles',
      '\\( (D) \\) et \\( (D\') \\) ne sont pas parallèles',
      '\\( (D) \\) et \\( (D\') \\) sont perpendiculaires',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q6',
    competencies: ['C2'],
    question:
      'Si deux plans \\( (P) \\) et \\( (P\') \\) sont parallèles, tout plan \\( (Q) \\) parallèle à l\'un des deux plans est parallèle à l\'autre plan. Quelle figure représente cette propriété ?',
    options: ['Figure 1', 'Figure 2'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: ['/images/geometry/geo-space/q6.jpg', '/images/geometry/geo-space/q6-1.jpg'],
    part: 'course',
  },
  {
    id: 'Q7',
    competencies: ['C2'],
    question:
      'Une droite \\( (D) \\) est parallèle à un plan \\( (P) \\) si et seulement si :',
    options: [
      '\\( (D) \\) est parallèle à toute droite incluse dans \\( (P) \\)',
      '\\( (D) \\) est parallèle à une seule droite incluse dans \\( (P) \\)',
      '\\( (D) \\) est incluse dans \\( (P) \\)',
    ],
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'course',
  },
  {
    id: 'Q8',
    competencies: ['C2'],
    question: 'Deux plans \\( (P) \\) et \\( (P\') \\) sont parallèles. Alors :',
    options: [
      'toute droite \\( (D) \\) qui coupe l\'un des deux plans coupe aussi l\'autre',
      'toute droite \\( (D) \\) orthogonale à l\'un des deux plans est orthogonale à l\'autre',
      'toute droite \\( (D) \\) qui coupe l\'un des deux plans ne coupe pas l\'autre',
    ],
    correctAnswer: [0, 1],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q8.png',
    part: 'course',
  },
  {
    id: 'Q9',
    competencies: ['C2'],
    question:
      'Deux plans \\( (P) \\) et \\( (P\') \\) sont parallèles. Tout plan \\( (Q) \\) coupe \\( (P) \\) suivant une droite \\( (\\Delta) \\) et coupe \\( (P\') \\) suivant une droite \\( (\\Delta\') \\), et \\( (\\Delta) \\parallel (\\Delta\') \\). Quelles figures représentent cette propriété ?',
    options: ['Figure 1', 'Figure 2'],
    correctAnswer: [0, 1],
    requiresImage: true,
    imagePath: ['/images/geometry/geo-space/q9-1.png', '/images/geometry/geo-space/q9-2.png'],
    part: 'course',
  },
  {
    id: 'Q10',
    competencies: ['C2'],
    question:
      'Si une droite \\( (D) \\) est strictement parallèle à deux plans sécants \\( (P) \\) et \\( (P\') \\) suivant une droite \\( (\\Delta) \\), alors les droites \\( (D) \\) et \\( (\\Delta) \\) sont …',
    options: ['Parallèles', 'Perpendiculaires', 'Sécantes'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q10.png',
    part: 'course',
  },
  {
    id: 'Q11',
    competencies: ['C2'],
    question:
      'Si deux droites \\( (D) \\) et \\( (D\') \\) sont orthogonales, toute droite \\( (\\Delta) \\) parallèle à l\'une de ces deux droites :',
    options: [
      'est orthogonale à l\'autre droite',
      'est parallèle à l\'autre droite',
      'est sécante à l\'autre droite',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q11.png',
    part: 'course',
  },
  {
    id: 'Q12',
    competencies: ['C2'],
    question:
      'Si deux droites \\( (D) \\) et \\( (D\') \\) sont parallèles et la droite \\( (\\Delta) \\) est orthogonale à l\'une des deux droites, alors :',
    options: [
      '\\( (\\Delta) \\) est parallèle à l\'autre droite',
      '\\( (\\Delta) \\) est orthogonale à l\'autre droite',
      '\\( (\\Delta) \\) est orthogonale à \\( (D) \\) seulement',
    ],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q12.png',
    part: 'course',
  },
  {
    id: 'Q13',
    competencies: ['C2'],
    question:
      'Déterminer la position relative de \\( (D) \\) et \\( (D\') \\) dans le cas suivant :',
    options: [
      '\\( (D) \\) et \\( (D\') \\) sont sécantes',
      '\\( (D) \\) et \\( (D\') \\) sont coplanaires',
      '\\( (D) \\) et \\( (D\') \\) sont incluses dans le plan \\( (P) \\)',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q13.png',
    part: 'course',
  },
  {
    id: 'Q14',
    competencies: ['C2'],
    question: 'Déterminer la position relative de \\( (D) \\) et \\( (P) \\) :',
    options: [
      '\\( (D) \\) et \\( (D\') \\) sont parallèles',
      '\\( (D) \\) et \\( (P) \\) sont inclus dans le plan \\( (P) \\)',
      '\\( (D) \\) est parallèle à toute droite incluse dans le plan \\( (P) \\)',
    ],
    correctAnswer: 2,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q14.png',
    part: 'course',
  },
  {
    id: 'Q15',
    competencies: ['C2'],
    question:
      '\\( (D) \\) est orthogonale à \\( (P) \\) et \\( (D\') \\) est incluse dans \\( (P) \\). Déterminer les positions relatives de \\( (D) \\) et \\( (D\') \\) :',
    options: [
      '\\( (D) \\) et \\( (D\') \\) sont parallèles',
      '\\( (D) \\) et \\( (D\') \\) sont orthogonales',
      '\\( (D) \\) est orthogonale à toute droite incluse dans \\( (P) \\)',
    ],
    correctAnswer: [1, 2],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q15.png',
    part: 'course',
  },
  {
    id: 'Q16',
    competencies: ['C2'],
    question:
      'Déterminer la position relative de \\( (D) \\) et le plan \\( (P) \\) :',
    options: [
      'La droite \\( (D) \\) coupe le plan \\( (P) \\) en un seul point',
      '\\( I \\) est l\'intersection du plan \\( (P) \\) et de la droite \\( (D) \\)',
      '\\( (D) \\) est orthogonale au plan \\( (P) \\) en \\( I \\)',
    ],
    correctAnswer: [0, 2],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q16.png',
    part: 'course',
  },
  {
    id: 'Q17',
    competencies: ['C2'],
    question:
      'Déterminer les positions relatives des deux plans \\( (P) \\) et \\( (P\') \\) :',
    options: [
      '\\( (P) \\) et \\( (P\') \\) sont parallèles',
      'Toute droite incluse dans \\( (P\') \\) est parallèle à \\( (P) \\)',
      'Toute droite \\( (D) \\) orthogonale à \\( (P) \\) est orthogonale à \\( (P\') \\)',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q17.png',
    part: 'course',
  },
  {
    id: 'Q18',
    competencies: ['C2'],
    question:
      'Déterminer la position relative de la droite \\( (D) \\) et le plan \\( (P) \\) comme figurée sur la photo ci-dessous :',
    options: [
      '\\( (D) \\) et \\( (P) \\) sont parallèles',
      '\\( (D) \\) et \\( (P) \\) sont coplanaires',
      '\\( (D) \\) et \\( (P) \\) sont sécantes en \\( A \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q18.png',
    part: 'course',
  },

  // ─── Partie II — Questions de raisonnement ───────────────────────────────
  {
    id: 'Q19a',
    competencies: ['C1', 'C2'],
    question:
      'Voir la figure ci-dessous. L\'intersection du plan \\( (ILB) \\) et du plan \\( (DCG) \\) est :',
    options: [
      'Le point \\( C \\)',
      'La droite \\( (CG) \\)',
      'La droite \\( (CD) \\)',
    ],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q19.png',
    part: 'reasoning',
  },
  {
    id: 'Q19b',
    competencies: ['C1', 'C2'],
    question:
      'Voir la figure ci-dessous. L\'intersection du plan \\( (ABC) \\) et du plan \\( (BCG) \\) est :',
    options: [
      'La droite \\( (BC) \\)',
      'La droite \\( (AB) \\)',
      'La droite \\( (BF) \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q19.png',
    part: 'reasoning',
  },
  {
    id: 'Q19c',
    competencies: ['C1', 'C2'],
    question:
      'Voir la figure ci-dessous. L\'intersection de la droite \\( (CG) \\) et du plan \\( (ABD) \\) est le point :',
    options: [
      '\\( C \\)',
      '\\( A \\)',
      '\\( B \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q19.png',
    part: 'reasoning',
  },
  {
    id: 'Q20',
    competencies: ['C2', 'C3'],
    question:
      '\\( ABCD \\) est un tétraèdre. \\( I \\in [AB] \\), \\( J \\in [AC] \\), \\( K \\in [CD] \\). La section en rose représente :',
    options: [
      'La section d\'intersection du tétraèdre \\( ABCD \\) par le plan \\( (IJK) \\)',
      'La section d\'intersection du tétraèdre \\( ABCD \\) par le plan \\( (ABD) \\)',
      'La section d\'intersection du plan \\( (ABC) \\) par le plan \\( (IJK) \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q20.png',
    part: 'reasoning',
  },
  {
    id: 'Q21',
    competencies: ['C2', 'C3'],
    question:
      '\\( ABCD \\) est un tétraèdre. \\( I \\in (AB) \\) et \\( J \\in (ACD) \\). L\'intersection de la droite \\( (IJ) \\) et du plan \\( (BCD) \\) est :',
    options: ['\\( E \\)', '\\( F \\)'],
    correctAnswer: [0, 1],
    requiresImage: true,
    imagePath: '/images/geometry/geo-space/q21.png',
    part: 'reasoning',
  },
]

// ─── Result persistence ─────────────────────────────────────────────────────

export function listGeoSpaceResults(): GeoSpaceResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(GEO_SPACE_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as GeoSpaceResult[]) : []
  } catch {
    return []
  }
}

export function saveGeoSpaceResult(r: GeoSpaceResult) {
  if (typeof window === 'undefined') return
  const all = listGeoSpaceResults()
  all.push(r)
  window.localStorage.setItem(GEO_SPACE_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('geo-space-changed'))
}
