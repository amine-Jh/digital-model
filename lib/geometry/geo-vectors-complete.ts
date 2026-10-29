/**
 * Vecteurs & Translation — leçon « Cognition et apprentissage de la géométrie »
 *
 * Parties : cours (Q1–Q7) + auto-évaluation · construction (Q8–Q18) +
 * auto-évaluation démonstration · raisonnement (Q19–Q21).
 * Capacités C1–C5 : voir `CAPACITIES_BY_TEST['test-geo-vectors-complete']`.
 * Seules AutoEval-1 et AutoEval-3 sont hors barème. Q9–Q11 (placements) et
 * Q18 (coefficients) sont auto-notées et agrégées à C1 et au score global.
 *
 */

export const VECTORS_TEST_ID = 'test-geo-vectors-complete'
export const VECTORS_RESULTS_KEY = 'geo-vectors:results'

/** Lattice target for a named point. `verified: false` → saisie conservée, hors barème. */
export type VectorsPlacementExpected = {
  name: string
  x: number
  y: number
  verified?: boolean
}

export type VectorsFillField = {
  label: string
  expected?: string
  /** false → champ affiché / enregistré, non noté (corrigé manuscrit illisible ou contradictoire). */
  verified?: boolean
}

export interface VectorsQuestion {
  id: string
  competencies: string[]
  question: string
  options: string[]
  correctAnswer: number | number[] | null
  requiresImage: boolean
  imagePath?: string
  /** When true, the interactive coordinate plane is rendered (LEFT panel). */
  showCoordPlane?: boolean
  /** Students click the plane to place named points; scored via placementExpected. */
  pointPlacement?: { count: number; labels: string[] }
  /**
   * Q10 / Q11: one point at a time, immediate green/red, then auto-advance.
   * Expected coords live on the server (`vectors-placement-keys.ts`).
   */
  sequentialPlacement?: boolean
  /** Lattice coords used to auto-grade pointPlacement (partial credit = k / N). */
  placementExpected?: VectorsPlacementExpected[]
  /** Numeric collinearity coefficients (inline inputs), scored when fillGraded. */
  fillIn?: { fields: VectorsFillField[] }
  /** When true with fillIn, auto-grade numeric answers (order-sensitive). */
  fillGraded?: boolean
  part: 'autoeval' | 'course' | 'autoeval2' | 'construction' | 'autoeval3' | 'reasoning'
  correction?: string
}

/**
 * Canonical points used by Q8 → Q18 — labelled on the coordinate plane.
 * Updated per spec:
 *   A(0,1), B(5,1), C(-1,-3), D(2,0), E(0,-2), F(6,0), G(8,1), H(8,-3),
 *   C'(4,-3), F'(4,-2)
 */
export const VECTOR_POINTS: { name: string; x: number; y: number }[] = [
  { name: 'A',  x: 0,  y: 1  },
  { name: 'B',  x: 5,  y: 1  },
  { name: 'C',  x: -1, y: -3 },
  { name: 'D',  x: 2,  y: 0  },
  { name: 'E',  x: 0,  y: -2 },
  { name: 'F',  x: 6,  y: 0  },
  { name: 'G',  x: 8,  y: 1  },
  { name: 'H',  x: 8,  y: -3 },
  { name: "C'", x: 4,  y: -3 },
  { name: "F'", x: 4,  y: -2 },
]

export interface VectorsTrialResult {
  index: number
  questionId: string
  selected: number
  selectedList?: number[]
  freeText?: string
  correct: boolean
  /** Per-question score in [0, 1] — supports partial credit. */
  score?: number
  reactionTimeMs: number
}

export interface VectorsResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: VectorsTrialResult[]
  totalMs: number
  correctCount: number
  score: number
}

export const VECTORS_QUESTIONS: VectorsQuestion[] = [
  {
    id: 'AutoEval-1',
    competencies: [],
    question: 'À quel degré tu te rappelles la leçon des vecteurs et translation ?',
    options: [
      'J\'ai tout oublié',
      'Je me rappelle',
      'Je me rappelle quelques parties',
      'Je me rappelle tout'
    ],
    correctAnswer: null,
    requiresImage: false,
    part: 'autoeval',
    correction: 'Auto-évaluation'
  },
  {
    id: 'Q1',
    competencies: ['C2'],
    question: 'Soient deux vecteurs colinéaires \\( \\vec{FG} \\) et \\( \\vec{AB} \\). Alors :',
    options: [
      'Les droites (FG) et (AB) sont parallèles, \\( FG = AB \\) et les vecteurs ont le même sens',
      'Les droites (FG) et (AB) sont parallèles et \\( FG = AB \\)',
      'Les vecteurs vérifient \\( \\vec{FG} = k\\, \\vec{AB} \\), avec \\( k \\in \\mathbb{R} \\)',
      'J\'ai oublié'
    ],
    correctAnswer: 2,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte: C'
  },
  {
    id: 'Q2',
    competencies: ['C2'],
    question: '\\( \\vec{AB} - \\vec{BG} = \\;? \\)',
    options: [
      '\\( \\vec{AG} \\)',
      '\\( \\vec{GB} \\)',
      '\\( -\\vec{AG} \\)',
      'Aucune réponse'
    ],
    correctAnswer: 3,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte: D uniquement'
  },
  {
    id: 'Q3',
    competencies: ['C2'],
    question: 'Soit \\( I \\) le milieu du segment \\( [AB] \\). Alors :',
    options: [
      '\\( \\vec{AI} + \\vec{IB} = \\vec{0} \\)',
      '\\( \\vec{AI} + \\vec{BI} = \\vec{0} \\)',
      '\\( \\vec{AB} - 2\\vec{IB} = \\vec{0} \\)',
      'J\'ai oublié'
    ],
    correctAnswer: [1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes: B, C'
  },
  {
    id: 'Q4',
    competencies: ['C2', 'C4'],
    question: 'Une translation conserve :',
    options: [
      'L\'alignement des points',
      'Les distances',
      'Les angles',
      'J\'ai oublié'
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes: A, B, C'
  },
  {
    id: 'Q5',
    competencies: ['C2'],
    question: 'Si \\( \\vec{AB} = \\vec{FG} \\), alors :',
    options: [
      'Le quadrilatère \\( ABFG \\) est un parallélogramme',
      '\\( G \\) est l\'image de \\( F \\) par la translation de vecteur \\( \\vec{AB} \\)',
      'Le quadrilatère \\( ABGF \\) est un parallélogramme',
      'J\'ai oublié'
    ],
    correctAnswer: [1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes: B, C'
  },
  {
    id: 'Q6',
    competencies: ['C2'],
    question: 'Si \\( \\vec{AB} = \\vec{BG} \\), alors :',
    options: [
      'Les points \\( A, B, G \\) sont alignés',
      '\\( A \\) est le milieu du segment \\( [BG] \\)',
      'Les vecteurs \\( \\vec{AB} \\) et \\( \\vec{BG} \\) sont colinéaires',
      'J\'ai oublié'
    ],
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes: A, C'
  },
  {
    id: 'Q7',
    competencies: ['C2'],
    question: '\\( \\vec{AB} + \\vec{AG} = \\vec{0} \\) signifie que :',
    options: [
      '\\( A \\) est le milieu de \\( [BG] \\)',
      '\\( \\vec{AB} = \\vec{AG} \\)',
      '\\( B \\) est le milieu de \\( [AG] \\)',
      'J\'ai oublié'
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte: A'
  },
  // ─── Partie II : Application sur la figure (Q8 → Q18) ──────────────────────
  // All Q8 → Q18 questions share the same static figure: vecteurs.png.
  {
    id: 'Q8',
    competencies: ['C2'],
    question:
      'Cocher les affirmations correctes parmi les vecteurs de la figure :',
    options: [
      '\\( \\vec{AB} = \\vec{BG} \\)',
      '\\( \\vec{AB} \\) et \\( \\vec{C\'H} \\) sont colinéaires',
      '\\( \\vec{AB} \\) et \\( \\vec{CC\'} \\) sont opposés',
      '\\( \\vec{DE} \\) et \\( \\vec{F\'F} \\) sont opposés',
      '\\( \\vec{DE} = \\vec{FF\'} \\)',
    ],
    correctAnswer: [1, 3, 4],
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponses correctes : B, D, E',
  },
  {
    id: 'Q9',
    competencies: ['C1'],
    question:
      'Placer le point \\( I \\) tel que : \\( \\vec{AI} = \\dfrac{2}{5}\\vec{AB} \\)',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    showCoordPlane: true,
    pointPlacement: { count: 1, labels: ['I'] },
    placementExpected: [{ name: 'I', x: 2, y: 1 }],
    part: 'construction',
    correction: 'Réponse attendue : \\( I(2\\,;\\,1) \\)',
  },
  {
    id: 'Q10',
    competencies: ['C1'],
    question:
      'Placer les points \\( Q \\) puis \\( M \\) tels que : \\( \\vec{BQ} = \\vec{BG} + \\vec{BC\'} \\) et \\( \\vec{AM} = \\vec{AB} + \\vec{AD} \\)',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    showCoordPlane: true,
    sequentialPlacement: true,
    pointPlacement: { count: 2, labels: ['Q', 'M'] },
    part: 'construction',
    correction: 'Placement séquentiel de Q puis M (clés côté serveur).',
  },
  {
    id: 'Q11',
    competencies: ['C1'],
    question:
      'Placer les points \\( P \\) puis \\( N \\) tels que : \\( \\vec{DE} = -\\vec{C\'P} \\) et \\( \\vec{AN} = \\vec{BH} \\)',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    showCoordPlane: true,
    sequentialPlacement: true,
    pointPlacement: { count: 2, labels: ['P', 'N'] },
    part: 'construction',
    correction: 'Placement séquentiel de P puis N (clés côté serveur).',
  },
  {
    id: 'Q12',
    competencies: ['C1'],
    question: 'Donner les parallélogrammes présents dans la figure :',
    options: ['ABDC', 'DEFF\'', 'BC\'GH', 'ABHG'],
    correctAnswer: 1,
    requiresImage: true,
    // Q12 reads the same coordinate system (O, I, J) as Q9-Q11.
    showCoordPlane: true,
    part: 'construction',
    correction: 'Réponse correcte : B (DEFF\')',
  },
  {
    id: 'Q13',
    competencies: ['C1', 'C3'],
    question: 'Compléter : \\( \\vec{AB} + \\vec{AC} = \\;? \\)',
    options: [
      '\\( \\vec{AC\'} \\)',
      '\\( \\vec{AD} \\)',
      '\\( \\vec{BC} \\)',
      '\\( \\vec{AA} \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponse correcte : A',
  },
  {
    id: 'Q14',
    competencies: ['C2', 'C3'],
    question:
      'En utilisant la relation de Chasles : \\( \\vec{BG} + \\vec{AB} + \\vec{GH} = \\;? \\)',
    options: [
      '\\( \\vec{AH} \\)',
      '\\( \\vec{BH} \\)',
      '\\( \\vec{AG} \\)',
      '\\( \\vec{BA} \\)',
    ],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponse correcte : A',
  },
  {
    id: 'Q15',
    competencies: ['C1'],
    question: 'Si \\( N \\) est le milieu de \\( [AG] \\) alors (cocher la bonne réponse) :',
    options: [
      '\\( \\vec{AN} + \\vec{NG} = \\vec{0} \\)',
      '\\( \\vec{AN} + \\vec{GN} = \\vec{0} \\)',
      '\\( \\vec{AN} = \\vec{NG} \\)',
    ],
    correctAnswer: [1, 2],
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponses correctes : B et C',
  },
  {
    id: 'Q16',
    competencies: ['C4'],
    question:
      'Image du point \\( E \\) par la translation de vecteur \\( \\vec{C\'H} \\) :',
    options: ['\\( D \\)', '\\( F\' \\)', '\\( E \\)', '\\( C \\)'],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponse correcte : B',
  },
  {
    id: 'Q17',
    competencies: ['C4'],
    question:
      'Image du point \\( C \\) par la translation de vecteur \\( \\vec{AB} \\) :',
    options: ['\\( C\' \\)', '\\( D \\)', '\\( E \\)', '\\( A \\)'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponse correcte : A',
  },
  {
    id: 'Q18',
    competencies: ['C1'],
    question:
      'Compléter par les coefficients de colinéarité (voir l\'image « sens des vecteurs ») :',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/sens-des-vecteurs.png',
    fillIn: {
      fields: [
        { label: '\\( \\vec{MR} = \\;\\square\\; \\vec{MP} \\)', expected: '-1/3' },
        { label: '\\( \\vec{MR} = \\;\\square\\; \\vec{MN} \\)', expected: '3/4' },
        { label: '\\( \\vec{MS} = \\;\\square\\; \\vec{RN} \\)', expected: '5' },
      ],
    },
    fillGraded: true,
    part: 'construction',
    correction:
      'Noté : \\(\\vec{MR}=-\\tfrac{1}{3}\\vec{MP}\\), \\(\\vec{MR}=\\tfrac{3}{4}\\vec{MN}\\), \\(\\vec{MS}=5\\vec{RN}\\).',
  },
  {
    id: 'AutoEval-3',
    competencies: [],
    question:
      'La démonstration dans la leçon des vecteurs et translation est :',
    options: ['Très facile', 'Facile', 'Difficile', 'Très difficile'],
    correctAnswer: null,
    requiresImage: false,
    part: 'autoeval3',
    correction: 'Auto-évaluation',
  },
  {
    id: 'Q19',
    competencies: ['C1', 'C5'],
    question:
      'Si \\( \\overrightarrow{AB} + \\overrightarrow{AC} = \\overrightarrow{AD} \\) alors :',
    options: [
      '\\( ABDC \\) est un parallélogramme',
      '\\( B \\) est l’image de \\( A \\) par la translation qui transforme \\( C \\) en \\( D \\)',
      '\\( ABCD \\) est un rectangle',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A, B',
  },
  {
    id: 'Q20',
    competencies: ['C3'],
    question:
      'Si \\( \\overrightarrow{AB} = \\overrightarrow{FG} \\) et \\( \\overrightarrow{AC} = 2\\overrightarrow{FG} \\) alors :',
    options: [
      'Les points \\( A \\), \\( B \\) et \\( C \\) sont alignés',
      '\\( \\overrightarrow{AC} = 2\\overrightarrow{AB} \\)',
      'Les vecteurs \\( \\overrightarrow{AB} \\) et \\( \\overrightarrow{FG} \\) sont colinéaires',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A, B, C',
  },
  {
    id: 'Q21',
    competencies: ['C3'],
    question:
      'Si \\( \\overrightarrow{AF} = 2\\overrightarrow{AG} + 4\\overrightarrow{AE} \\) et \\( \\overrightarrow{AC} = \\overrightarrow{AG} + 2\\overrightarrow{AE} \\) alors :',
    options: [
      '\\( \\overrightarrow{AC} = 2\\overrightarrow{AF} \\)',
      '\\( \\overrightarrow{AF} = 2\\overrightarrow{AC} \\)',
      'Les points \\( A \\), \\( F \\) et \\( C \\) sont alignés',
      'Je ne sais pas',
    ],
    correctAnswer: [1, 2],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : B, C',
  },
]

export function isVectorsAutoEvalQuestion(q: VectorsQuestion): boolean {
  return (
    q.id.startsWith('AutoEval') ||
    q.part === 'autoeval' ||
    q.part === 'autoeval2' ||
    q.part === 'autoeval3'
  )
}

export function gradedPlacementExpected(q: VectorsQuestion): VectorsPlacementExpected[] {
  return (q.placementExpected ?? []).filter((p) => p.verified !== false)
}

export function hasGradedFillIn(q: VectorsQuestion): boolean {
  if (q.fillGraded !== true || !q.fillIn) return false
  return q.fillIn.fields.some((f) => f.verified !== false && Boolean(f.expected?.trim()))
}

export function isVectorsScorableQuestion(q: VectorsQuestion): boolean {
  if (isVectorsAutoEvalQuestion(q)) return false
  const gradedManual =
    q.sequentialPlacement === true ||
    gradedPlacementExpected(q).length > 0 ||
    hasGradedFillIn(q)
  if (q.correctAnswer === null && !gradedManual) return false
  return true
}

export function parseVectorsPlacements(freeText: string): { name: string; x: number; y: number }[] {
  const out: { name: string; x: number; y: number }[] = []
  const re = /(\w+)\((-?\d+)\s*;\s*(-?\d+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(freeText)) != null) {
    out.push({ name: m[1], x: Number(m[2]), y: Number(m[3]) })
  }
  return out
}

export function scoreVectorsPlacements(
  freeText: string,
  expected: VectorsPlacementExpected[],
): number {
  const graded = expected.filter((e) => e.verified !== false)
  if (graded.length === 0) return 0
  const got = parseVectorsPlacements(freeText)
  let ok = 0
  for (const e of graded) {
    const g = got.find((p) => p.name === e.name)
    if (g && g.x === e.x && g.y === e.y) ok++
  }
  return ok / graded.length
}

function normNumericInput(s: string): number | null {
  const t = s.trim().replace(',', '.').replace(/\s+/g, '')
  if (!t) return null
  if (t.includes('/')) {
    const [a, b] = t.split('/')
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isFinite(na) || !Number.isFinite(nb) || nb === 0) return null
    return na / nb
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function scoreVectorsFillIn(freeText: string, fields: VectorsFillField[]): number {
  const parts = freeText.split(' ; ').map((x) => x.trim())
  let ok = 0
  let n = 0
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    if (f.verified === false || !f.expected?.trim()) continue
    n++
    const a = normNumericInput(parts[i] ?? '')
    const b = normNumericInput(f.expected)
    if (a == null || b == null) continue
    if (Math.abs(a - b) < 1e-9) ok++
  }
  return n === 0 ? 0 : ok / n
}

/** Q11 N(3;−3) est la clé validée (figure). MR = k MS a été retiré de Q18. */
export const VECTORS_CORRECTION_REVIEW: {
  questionId: string
  status: 'needs-review'
  manuscript: string
  figureCheck: string
}[] = []

export function listVectorsResults(): VectorsResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(VECTORS_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as VectorsResult[]) : []
  } catch {
    return []
  }
}

export function saveVectorsResult(r: VectorsResult) {
  if (typeof window === 'undefined') return
  const all = listVectorsResults()
  all.push(r)
  window.localStorage.setItem(VECTORS_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('vectors-changed'))
}

export function getLatestVectorsResult(userName?: string): VectorsResult | undefined {
  const all = listVectorsResults()
    .filter((r) => !userName || r.userName === userName)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  return all[0]
}
