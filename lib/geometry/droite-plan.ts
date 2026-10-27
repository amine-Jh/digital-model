/**
 * Droite dans le plan — Cognitive Assessment Test
 *
 * Q1 auto-évaluation (hors barème). Q2 multi A,D,E. Q3 énoncé coordonnées
 * sans placement. Q10 Oui/Non. Q11 parallèle : A (notée).
 * Capacités C1–C2 : `CAPACITIES_BY_TEST['test-geo-line-plane']`.
 */

export const DROITE_PLAN_TEST_ID = 'test-geo-line-plane'
export const DROITE_PLAN_RESULTS_KEY = 'geo-droite-plan:results'

export interface DroitePlanQuestion {
  id: string
  number: number
  typeCode: 1 | 2 | 3
  competencies: string[]
  question: string
  options: string[]
  /** Single index, array of indices (multi-correct), or null (non noté). */
  correctAnswer: number | number[] | null
  imagePath?: string
  expectedText?: string
  isDiagnostic?: boolean
  /** Multi-select even when comparing manuscript keys. */
  allowMultiple?: boolean
  /** Q10 : boutons Oui / Non, sans justification. */
  yesNo?: boolean
  /** false → réponse enregistrée, hors barème auto (clé incertaine). */
  keyVerified?: boolean
}

export interface DroitePlanTrialResult {
  index: number
  questionId: string
  /** Single-select stores one index; multi-select stores all chosen indices. */
  selected: number | number[]
  correct: boolean
  /** Per-question score in [0, 1] — supports partial credit. */
  score?: number
  reactionTimeMs: number
}

export interface DroitePlanResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: DroitePlanTrialResult[]
  totalMs: number
  correctCount: number
  score: number
}

export const DROITE_PLAN_QUESTIONS: DroitePlanQuestion[] = [
  {
    id: 'T1-D2-Q1',
    number: 1,
    typeCode: 1,
    competencies: [],
    question: 'À quel degré te rappelles-tu la leçon « Droite dans le plan » ?',
    options: [
      'J\'ai tout oublié',
      'Je me rappelle quelques parties',
      'Je me rappelle bien',
      'Je me rappelle tout',
    ],
    correctAnswer: null,
    isDiagnostic: true,
  },
  {
    id: 'T1-D2-Q2',
    number: 2,
    typeCode: 1,
    competencies: ['C1'],
    question:
      'Dans le repère orthonormé \\( (O, \\vec{i}, \\vec{j}) \\), on considère les points \\( A(2,\\,-3) \\), \\( B(-1,\\,0) \\), \\( C(c,\\,0) \\) et la droite \\( (\\Delta) \\) d\'équation \\( 12x - 3y + 2 = 0 \\). Cochez les affirmations correctes.',
    options: [
      'Un vecteur directeur de \\( (\\Delta) \\) est \\( (1,\\,4) \\)',
      'Le point \\( A(2,-3) \\) appartient à \\( (\\Delta) \\)',
      'Le point \\( B(-1,0) \\) appartient à \\( (\\Delta) \\)',
      'Pour que \\( C(c,0) \\in (\\Delta) \\), il faut \\( c = -\\dfrac{1}{6} \\)',
      'Le coefficient directeur de \\( (\\Delta) \\) est \\( 4 \\)',
    ],
    allowMultiple: true,
    correctAnswer: [0, 3, 4],
  },
  {
    id: 'T1-D2-Q3',
    number: 3,
    typeCode: 1,
    competencies: ['C1'],
    question:
      'Soient les points \\( A(2\\,;\\,-3) \\), \\( B(-1\\,;\\,0) \\), \\( C(0\\,;\\,1) \\) et la droite \\( D \\) d\'équation \\( 2x - 3y + 2 = 0 \\). Laquelle de ces affirmations est correcte ?',
    options: [
      'La droite \\( D \\) passe par \\( B(-1, 0) \\) et a pour pente \\( \\dfrac{2}{3} \\)',
      'La droite \\( D \\) passe par \\( A(2, -3) \\)',
      'La droite \\( D \\) est parallèle à l\'axe des abscisses',
      'La droite \\( D \\) a pour pente \\( -\\dfrac{2}{3} \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T1-D2-Q4',
    number: 4,
    typeCode: 1,
    competencies: ['C1'],
    question: 'Toute droite du plan admet une équation cartésienne de la forme :',
    options: [
      '\\( ax + by + c = 0 \\) avec \\( (a,b) \\neq (0,0) \\)',
      '\\( y = ax^2 + bx + c \\)',
      '\\( ax + by = 0 \\) uniquement',
      '\\( \\dfrac{x}{a} + \\dfrac{y}{b} = 1 \\) uniquement',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T1-D2-Q5',
    number: 5,
    typeCode: 1,
    competencies: ['C1'],
    question:
      'Un vecteur directeur de la droite d\'équation \\( ax + by + c = 0 \\) est :',
    options: [
      '\\( \\vec{u}(-b,\\,a) \\)',
      '\\( \\vec{u}(a,\\,b) \\)',
      '\\( \\vec{u}(b,\\,a) \\)',
      '\\( \\vec{u}(a,\\,-b) \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T1-D2-Q6',
    number: 6,
    typeCode: 1,
    competencies: ['C1'],
    question:
      'Si \\( b \\neq 0 \\), le coefficient directeur (pente) de la droite d\'équation \\( ax + by + c = 0 \\) est :',
    options: [
      '\\( m = -\\dfrac{a}{b} \\)',
      '\\( m = \\dfrac{a}{b} \\)',
      '\\( m = -\\dfrac{b}{a} \\)',
      '\\( m = \\dfrac{b}{a} \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T1-D2-Q7',
    number: 7,
    typeCode: 2,
    competencies: ['C1'],
    question:
      'Mettre la droite \\( (\\Delta) \\) : \\( 2x - 3y + 2 = 0 \\) sous forme réduite \\( y = mx + p \\) :',
    options: [
      '\\( y = \\dfrac{2}{3}x + \\dfrac{2}{3} \\)',
      '\\( y = \\dfrac{3}{2}x + 1 \\)',
      '\\( y = -\\dfrac{2}{3}x + \\dfrac{2}{3} \\)',
      '\\( y = \\dfrac{2}{3}x - \\dfrac{2}{3} \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T2-D2-Q8',
    number: 8,
    typeCode: 2,
    competencies: ['C1'],
    question:
      'Pour \\( (\\Delta) \\) : \\( 2x - 3y + 2 = 0 \\), un vecteur directeur \\( \\vec{u} \\) et un vecteur normal \\( \\vec{n} \\) sont :',
    options: [
      '\\( \\vec{u}(3,\\,2) \\) et \\( \\vec{n}(2,\\,-3) \\)',
      '\\( \\vec{u}(2,\\,-3) \\) et \\( \\vec{n}(3,\\,2) \\)',
      '\\( \\vec{u}(-2,\\,3) \\) et \\( \\vec{n}(3,\\,2) \\)',
      '\\( \\vec{u}(2,\\,3) \\) et \\( \\vec{n}(-3,\\,2) \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T2-D2-Q9',
    number: 9,
    typeCode: 2,
    competencies: ['C1'],
    question:
      'Équation de la droite passant par \\( A(2,\\,-3) \\) et de coefficient directeur \\( m = \\tfrac{2}{3} \\) :',
    options: [
      '\\( y = \\dfrac{2}{3}x - \\dfrac{13}{3} \\)',
      '\\( y = \\dfrac{2}{3}x - 3 \\)',
      '\\( y = \\dfrac{2}{3}x + \\dfrac{13}{3} \\)',
      '\\( y = -\\dfrac{2}{3}x - \\dfrac{13}{3} \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T3-D2-Q10',
    number: 10,
    typeCode: 3,
    competencies: ['C2'],
    question:
      'Le point \\( A(2,\\,-3) \\) appartient-il à la droite \\( (\\Delta) \\) d\'équation \\( 2x - 3y + 2 = 0 \\) ?',
    options: ['Oui', 'Non'],
    yesNo: true,
    correctAnswer: 1,
  },
  {
    id: 'T3-D2-Q11',
    number: 11,
    typeCode: 3,
    competencies: ['C2'],
    question:
      'Parmi les droites suivantes, laquelle est parallèle à \\( (\\Delta) \\) : \\( 2x - 3y + 2 = 0 \\) ?',
    options: [
      '\\( 4x - 6y + 7 = 0 \\)',
      '\\( 3x + 2y - 1 = 0 \\)',
      '\\( 2x + 3y + 2 = 0 \\)',
      '\\( x - y + 1 = 0 \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T3-D2-Q12',
    number: 12,
    typeCode: 3,
    competencies: ['C2'],
    question:
      'Équation de la droite \\( (\\Delta\') \\) passant par \\( A(2,\\,-3) \\) et perpendiculaire à \\( (\\Delta) \\) : \\( 2x - 3y + 2 = 0 \\) :',
    options: [
      '\\( 3x + 2y = 0 \\)',
      '\\( 2x - 3y - 13 = 0 \\)',
      '\\( 3x - 2y - 12 = 0 \\)',
      '\\( 2x + 3y + 5 = 0 \\)',
    ],
    correctAnswer: 0,
  },
  {
    id: 'T3-D2-Q13',
    number: 13,
    typeCode: 3,
    competencies: ['C2'],
    question:
      'Distance du point \\( A(2,\\,-3) \\) à la droite \\( (\\Delta) \\) : \\( 2x - 3y + 2 = 0 \\), donnée par \\( d(A, \\Delta) = \\dfrac{|2x_A - 3y_A + 2|}{\\sqrt{2^2 + 3^2}} \\) :',
    options: [
      '\\( d = \\dfrac{15}{\\sqrt{13}} = \\dfrac{15\\sqrt{13}}{13} \\)',
      '\\( d = \\dfrac{15}{\\sqrt{5}} \\)',
      '\\( d = \\dfrac{13}{\\sqrt{15}} \\)',
      '\\( d = 15 \\)',
    ],
    correctAnswer: 0,
  },
]

export const DROITE_PLAN_TYPE_LABELS: Record<number, string> = {
  1: 'Partie I — Questions du cours',
  2: 'Partie II — Questions de la construction',
  3: 'Partie III — Questions de raisonnement',
}

export function isDroitePlanMulti(q: DroitePlanQuestion): boolean {
  if (q.allowMultiple === true) return true
  return Array.isArray(q.correctAnswer) && q.correctAnswer.length > 1
}

export function isDroitePlanScorableQuestion(q: DroitePlanQuestion): boolean {
  if (q.isDiagnostic) return false
  if (q.keyVerified === false) return false
  if (q.correctAnswer === null) return false
  return true
}

/**
 * Écarts manuscrit / énoncé en place. Les clés auto-notées suivent l’énoncé
 * actuel lorsqu’il est cohérent.
 */
export const DROITE_PLAN_CORRECTION_REVIEW: {
  questionId: string
  status: 'needs-review' | 'checked-against-stem'
  manuscript: string
  note: string
}[] = [
  {
    questionId: 'T1-D2-Q1',
    status: 'needs-review',
    manuscript: 'A, D, E',
    note:
      'Q1 actuelle = auto-évaluation (4 options A–D, pas de E). La clé A,D,E correspond à Q2 (cinq affirmations). Non appliquée à Q1.',
  },
  {
    questionId: 'T1-D2-Q2',
    status: 'checked-against-stem',
    manuscript: 'A, D, E',
    note:
      'Cohérent avec 12x−3y+2=0 : directeur (1,4), c=−1/6, pente 4. A et B n’appartiennent pas à (Δ).',
  },
  {
    questionId: 'T1-D2-Q3',
    status: 'checked-against-stem',
    manuscript: 'A(2;−3), B(−1;0), C(0;1), D: 2x−3y+2=0 — pas de placement',
    note:
      'C a été corrigé en (0;1). Propositions d’origine conservées. A reste vraie (B ∈ D et pente 2/3).',
  },
  {
    questionId: 'T3-D2-Q11',
    status: 'checked-against-stem',
    manuscript: 'A',
    note:
      'Notée. (4x−6y+7=0) est parallèle à (2x−3y+2=0) (vecteurs normaux proportionnels, constantes distinctes).',
  },
]

export function listDroitePlanResults(): DroitePlanResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DROITE_PLAN_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as DroitePlanResult[]) : []
  } catch {
    return []
  }
}

export function saveDroitePlanResult(r: DroitePlanResult) {
  if (typeof window === 'undefined') return
  const all = listDroitePlanResults()
  all.push(r)
  window.localStorage.setItem(DROITE_PLAN_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('droite-plan-changed'))
}
