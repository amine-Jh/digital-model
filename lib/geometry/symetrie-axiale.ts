/**
 * Symétrie axiale — évaluation cognitive (Tronc commun, Maroc).
 *
 * Barème : Q2–Q15 → 1 pt (C1 /14) · Q16–Q18 → 2 pts (C2 /6) · Total /20.
 * Les auto-évaluations (Q1, AE2, AE3) ne comptent pas dans le score.
 */

export const SYMETRIE_AXIALE_TEST_ID = 'test-geo-symetrie-axiale'
export const SYMETRIE_AXIALE_RESULTS_KEY = 'symetrie-axiale:results'

export interface SymetrieAxialeQuestion {
  id: string
  competencies: string[]
  question: string
  options: string[]
  correctAnswer: number | number[] | null
  requiresImage: boolean
  imagePath?: string
  part:
    | 'preQuestion'
    | 'course'
    | 'autoeval2'
    | 'visualization'
    | 'autoeval3'
    | 'reasoning'
  correction?: string
  /** 0 = non compté ; 1 = items C1 ; 2 = items C2 */
  points?: number
}

export interface SymetrieAxialeTrialResult {
  index: number
  questionId: string
  selected: number[]
  correct: boolean
  /** Score fractionnaire [0, 1] (questions à choix multiples). */
  score?: number
  pointsEarned?: number
  reactionTimeMs: number
}

export interface SymetrieAxialeResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: SymetrieAxialeTrialResult[]
  totalMs: number
  correctCount: number
  /** Pourcentage basé sur le barème pondéré /20. */
  score: number
  scorePoints: number
  maxScorePoints: number
}

const IMG = '/images/geometry/symetrie-axiale/shared-i.png'

export const SYMETRIE_AXIALE_QUESTIONS: SymetrieAxialeQuestion[] = [
  {
    id: 'Q1',
    competencies: [],
    question:
      'À quel degré te rappelles-tu la leçon sur la symétrie axiale ?',
    options: [
      'J\'ai complètement oublié la leçon',
      'Je me rappelle de quelques notions seulement',
      'Je me rappelle globalement la leçon',
      'Je maîtrise bien la leçon',
    ],
    correctAnswer: null,
    requiresImage: false,
    part: 'preQuestion',
    correction: 'Auto-évaluation',
    points: 0,
  },
  {
    id: 'Q2',
    competencies: ['C1'],
    question: 'La symétrie axiale conserve :',
    options: [
      'Les longueurs, les angles et l\'alignement des points',
      'Les longueurs seulement',
      'Les angles seulement',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte : A',
    points: 1,
  },
  {
    id: 'Q3',
    competencies: ['C1'],
    question:
      'Si $M$ et $M\'$ sont symétriques par rapport à une droite $(d)$, alors :',
    options: [
      'La droite $(d)$ est la médiatrice du segment $[MM\']$',
      'Le segment $[MM\']$ est perpendiculaire à $(d)$',
      'Les distances de $M$ et de $M\'$ à $(d)$ sont égales',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes : A, B, C',
    points: 1,
  },
  {
    id: 'Q4',
    competencies: ['C1'],
    question:
      'Si $E$ et $F$ sont les symétriques respectifs des points $A$ et $B$ par rapport à $(d)$, alors :',
    options: [
      'Le segment $[AB]$ est le symétrique du segment $[EF]$ par rapport à $(d)$',
      '$AB = EF$',
      'Le quadrilatère $ABEF$ peut être un parallélogramme',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes : A, B, C',
    points: 1,
  },
  {
    id: 'Q5',
    competencies: ['C1'],
    question:
      'Les symétriques de trois points alignés par rapport à une droite sont :',
    options: [
      'Trois points alignés',
      'Trois points non alignés',
      'Quatre points alignés',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte : A',
    points: 1,
  },
  {
    id: 'Q6',
    competencies: ['C1'],
    question:
      'Dans un rectangle $ABCD$, l\'image de l\'angle $\\widehat{ABC}$ par rapport à un axe de symétrie du rectangle est :',
    options: [
      'Un angle de même mesure',
      'Un angle droit uniquement',
      'Un angle différent',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'course',
    correction: 'Réponse correcte : A',
    points: 1,
  },
  {
    id: 'AE2',
    competencies: [],
    question:
      'Rencontres-tu des difficultés dans la construction des symétriques de points, segments ou figures par rapport à une droite ?',
    options: ['Oui', 'Non'],
    correctAnswer: null,
    requiresImage: false,
    part: 'autoeval2',
    correction: 'Auto-évaluation',
    points: 0,
  },
  {
    id: 'Q7',
    competencies: ['C1'],
    question:
      'Sur la figure ci-dessous (axe $(d)$), parmi les affirmations suivantes, laquelle est vraie ?',
    options: [
      'Le symétrique du point $A$ par rapport à $(d)$ est le point $F$',
      'Le symétrique du point $A$ par rapport à $(d)$ est le point $C$',
      'Le symétrique du point $G$ par rapport à $(d)$ est le point $H$',
      'Aucune réponse',
    ],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : B',
    points: 1,
  },
  {
    id: 'Q8',
    competencies: ['C1'],
    question:
      'Sur la figure ci-dessous, le symétrique du segment $[AB]$ par rapport à $(d)$ est :',
    options: ['$[BC]$', '$[AD]$', '$[DC]$', 'Aucune réponse'],
    correctAnswer: 2,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : C',
    points: 1,
  },
  {
    id: 'Q9',
    competencies: ['C1'],
    question:
      'Répondre par vrai ou faux : quelle affirmation est vraie ?',
    options: [
      'Le symétrique du point $A$ par rapport à $(GH)$ est le point $F$',
      'Le symétrique du point $A$ par rapport à $(EF)$ est le point $C$',
      'Le symétrique du point $G$ par rapport à $(BD)$ est le point $H$',
      'Aucune réponse',
    ],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : B',
    points: 1,
  },
  {
    id: 'Q10',
    competencies: ['C1'],
    question:
      'Sur la figure ci-dessous, le symétrique du segment $[AB]$ par rapport à $(EF)$ est le segment :',
    options: ['$[BC]$', '$[AD]$', '$[DC]$', 'Aucune réponse'],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : B',
    points: 1,
  },
  {
    id: 'Q11',
    competencies: ['C1'],
    question: 'Choisir les parallélogrammes à partir de la figure :',
    options: ['$ABCD$', '$AGFH$', '$EGFH$', 'Aucune réponse'],
    correctAnswer: [0, 2],
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponses correctes : A, C',
    points: 1,
  },
  {
    id: 'Q12',
    competencies: ['C1'],
    question:
      'Le symétrique de l\'angle $\\widehat{BAD}$ par rapport à $(GH)$ est :',
    options: ['$\\widehat{BCD}$', '$\\widehat{BAD}$', '$\\widehat{ADC}$', 'Aucune réponse'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : A',
    points: 1,
  },
  {
    id: 'Q13',
    competencies: ['C1'],
    question:
      'Le symétrique de l\'angle $\\widehat{BAC}$ par rapport à $(AC)$ est :',
    options: ['$\\widehat{BAD}$', '$\\widehat{BCD}$', '$\\widehat{CAD}$', 'Aucune réponse'],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : B',
    points: 1,
  },
  {
    id: 'Q14',
    competencies: ['C1'],
    question:
      'Le symétrique de la droite $(GH)$ par rapport à $(AC)$ est :',
    options: ['$(GH)$', '$(AC)$', '$(BD)$', 'Aucune réponse'],
    correctAnswer: [0, 1],
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponses correctes : A, B',
    points: 1,
  },
  {
    id: 'Q15',
    competencies: ['C1'],
    question:
      'Le symétrique de la droite $(EG)$ par rapport à $(AC)$ est :',
    options: ['$(GH)$', '$(FH)$', '$(CH)$', 'Aucune réponse'],
    correctAnswer: 1,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : B',
    points: 1,
  },
  {
    id: 'AE3',
    competencies: [],
    question:
      'La démonstration dans la leçon de symétrie axiale est, pour toi :',
    options: ['Très facile', 'Facile', 'Difficile', 'Très difficile'],
    correctAnswer: null,
    requiresImage: false,
    part: 'autoeval3',
    correction: 'Auto-évaluation',
    points: 0,
  },
  {
    id: 'Q16',
    competencies: ['C2'],
    question:
      'Si $ABCD$ est un parallélogramme et $I$ est son centre, et la droite $(D)$ est la médiatrice du segment $[AB]$ passant par $I$, alors :',
    options: [
      '$ABCD$ est un rectangle',
      '$ABCD$ est un carré',
      'On ne peut rien dire',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponse correcte : A',
    points: 2,
  },
  {
    id: 'Q17',
    competencies: ['C2'],
    question:
      'Si $ABCD$ est un rectangle, et $I$ et $J$ les milieux respectifs des segments $[AB]$ et $[CD]$, alors :',
    options: [
      '$A$ est le symétrique de $B$ par rapport à la droite $(IJ)$',
      '$D$ est le symétrique de $C$ par rapport à la droite $(IJ)$',
      '$[AB]$ est le symétrique de $[CD]$ par rapport à la droite $(IJ)$',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A, B, C',
    points: 2,
  },
  {
    id: 'Q18',
    competencies: ['C2'],
    question:
      'Si $ABC$ est un triangle rectangle en $A$, et le point $D$ est le symétrique de $B$ par rapport à la droite $(AC)$, alors :',
    options: [
      'Le triangle $BCD$ est un triangle isocèle',
      'Le symétrique de l\'angle $\\widehat{BCD}$ par rapport à $(AB)$ est l\'angle $\\widehat{BCD}$',
      'Le triangle $BCD$ est un triangle rectangle en $C$',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A, C',
    points: 2,
  },
]

export function listSymetrieAxialeResults(): SymetrieAxialeResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SYMETRIE_AXIALE_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as SymetrieAxialeResult[]) : []
  } catch {
    return []
  }
}

export function saveSymetrieAxialeResult(r: SymetrieAxialeResult) {
  if (typeof window === 'undefined') return
  const all = listSymetrieAxialeResults()
  all.push(r)
  window.localStorage.setItem(SYMETRIE_AXIALE_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('symetrie-axiale-changed'))
}

export function getLatestSymetrieAxialeResult(
  userName?: string,
): SymetrieAxialeResult | undefined {
  const all = listSymetrieAxialeResults()
    .filter((r) => !userName || r.userName === userName)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  return all[0]
}
