/**
 * Vecteurs & Translation — leçon « Cognition et apprentissage de la géométrie »
 *
 * Parties : cours (Q1–Q7) + auto-évaluation · construction (Q8–Q18) +
 * auto-évaluation démonstration · raisonnement (Q19–Q21).
 * Capacités C1–C5 : voir `CAPACITIES_BY_TEST['test-geo-vectors-complete']`.
 * Les auto-évaluations et questions ouvertes (placement, coefficients) ne sont
 * pas comptées dans le score automatique (voir exclusions).
 *
 */

export const VECTORS_TEST_ID = 'test-geo-vectors-complete'
export const VECTORS_RESULTS_KEY = 'geo-vectors:results'

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
  /** When true, students can click on the figure to place named points; the
   *  selection is recorded but not auto-graded (kept for review). */
  pointPlacement?: { count: number; labels: string[] }
  /** When set with pointPlacement, auto-grade clicks against these lattice coords. */
  placementExpected?: { name: string; x: number; y: number }[]
  /** When set, the question collects numeric collinearity coefficients
   *  using inline inputs (not auto-graded). */
  fillIn?: { fields: { label: string; expected?: string }[] }
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
    correctAnswer: 1,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte: B'
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
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes: A, C'
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
    correctAnswer: [2, 3, 4],
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponses correctes : C, D, E',
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
    placementExpected: [{ name: 'I', x: 1, y: 1 }],
    part: 'construction',
    correction: 'Réponse attendue : \\( I(1\\,;\\,1) \\)',
  },
  {
    id: 'Q10',
    competencies: ['C1'],
    question:
      'Placer les points \\( M \\) et \\( Q \\) tels que : \\( \\vec{AM} = \\vec{AB} + \\vec{AD} \\) et \\( \\vec{BQ} = \\vec{BG} + \\vec{BC\'} \\)',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    showCoordPlane: true,
    pointPlacement: { count: 2, labels: ['M', 'Q'] },
    placementExpected: [
      { name: 'M', x: 11, y: 7 },
      { name: 'Q', x: 7, y: -3 },
    ],
    part: 'construction',
    correction: 'Réponses attendues : \\( M(11\\,;\\,7) \\), \\( Q(7\\,;\\,-3) \\)',
  },
  {
    id: 'Q11',
    competencies: ['C1'],
    question:
      'Placer les points \\( N \\) et \\( P \\) tels que : \\( \\vec{AN} = \\vec{BH} \\) et \\( \\vec{DE} = -\\vec{C\'P} \\)',
    options: [],
    correctAnswer: null,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    showCoordPlane: true,
    pointPlacement: { count: 2, labels: ['N', 'P'] },
    placementExpected: [
      { name: 'N', x: 3, y: -3 },
      { name: 'P', x: 10, y: 6 },
    ],
    part: 'construction',
    correction: 'Réponses attendues : \\( N(3\\,;\\,-3) \\), \\( P(10\\,;\\,6) \\)',
  },
  {
    id: 'Q12',
    competencies: ['C1'],
    question: 'Donner les parallélogrammes présents dans la figure :',
    options: ['ABDC', 'DEFF\'', 'BC\'GH', 'ABHG'],
    correctAnswer: [0],
    requiresImage: true,
    // Q12 reads the same coordinate system (O, I, J) as Q9-Q11.
    showCoordPlane: true,
    part: 'construction',
    correction: 'Réponse correcte : A',
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
    correctAnswer: 1,
    requiresImage: true,
    imagePath: '/images/geometry/vectors/vecteurs.png',
    part: 'construction',
    correction: 'Réponse correcte : B',
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
        { label: '\\( \\vec{MR} = \\;\\square\\; \\vec{MP} \\)', expected: '-3' },
        { label: '\\( \\vec{MR} = \\;\\square\\; \\vec{MN} \\)', expected: '3/4' },
        { label: '\\( \\vec{MR} = \\;\\square\\; \\vec{MS} \\)', expected: '3/5' },
      ],
    },
    fillGraded: true,
    part: 'construction',
    correction: 'Réponses attendues (dans l\'ordre) : \\(-3\\), \\(\\tfrac{3}{4}\\), \\(\\tfrac{3}{5}\\)',
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
