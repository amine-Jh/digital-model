/**
 * Symétrie axiale — évaluation cognitive (Tronc commun, Maroc).
 *
 * C1 : Q2–Q13 (Q1 = auto-évaluation hors barème).
 * C2 : Q14–Q17 (Q18 conservée, hors tableau officiel Q1–Q17).
 * Barème existant : items de cours/figure 1 pt · raisonnement 2 pts.
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
  /** 0 = non compté ; 1 = items C1 / figure ; 2 = raisonnement C2 */
  points?: number
  allowMultiple?: boolean
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
    allowMultiple: true,
    correctAnswer: [0, 1, 2],
    requiresImage: false,
    part: 'course',
    correction: 'Réponses correctes : A, B, C',
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
    allowMultiple: true,
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
    allowMultiple: true,
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
      'Sur la figure ci-dessous (axe $(GH)$), parmi les affirmations suivantes, laquelle est vraie ?',
    options: [
      'Le symétrique du point $A$ par rapport à $(GH)$ est le point $F$',
      'Le symétrique du point $A$ par rapport à $(GH)$ est le point $C$',
      'Le symétrique du point $G$ par rapport à $(GH)$ est le point $H$',
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
      'Sur la figure ci-dessous, le symétrique du segment $[AB]$ par rapport à $(GH)$ est :',
    options: ['$[BC]$', '$[AD]$', '$[DC]$', 'Aucune réponse'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : A',
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
    correctAnswer: 2,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : C',
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
    allowMultiple: true,
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
    correctAnswer: 2,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : C ($\\widehat{CAD}$)',
    points: 1,
  },
  {
    id: 'Q14',
    competencies: ['C2'],
    question:
      'Le symétrique de la droite $(GH)$ par rapport à $(AC)$ est :',
    options: ['$(GH)$', '$(AC)$', '$(BD)$', 'Aucune réponse'],
    correctAnswer: 0,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : A ($(GH)$)',
    points: 1,
  },
  {
    id: 'Q15',
    competencies: ['C2'],
    question:
      'Le symétrique de la droite $(EG)$ par rapport à $(AC)$ est :',
    options: ['$(GH)$', '$(FH)$', '$(CH)$', '$(EH)$', 'Aucune réponse'],
    correctAnswer: 3,
    requiresImage: true,
    imagePath: IMG,
    part: 'visualization',
    correction: 'Réponse correcte : D ($(EH)$)',
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
    allowMultiple: true,
    correctAnswer: [0, 1],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A et B uniquement',
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
    allowMultiple: true,
    correctAnswer: [0, 2],
    requiresImage: false,
    part: 'reasoning',
    correction: 'Réponses correctes : A et C',
    points: 2,
  },
]

export function isAxialeMulti(q: SymetrieAxialeQuestion): boolean {
  if (q.allowMultiple === true) return true
  return Array.isArray(q.correctAnswer) && q.correctAnswer.length > 1
}

export const SYMETRIE_AXIALE_CORRECTION_REVIEW: {
  questionId: string
  status: 'needs-review' | 'checked'
  manuscript: string
  note: string
}[] = [
  {
    questionId: 'Q1',
    status: 'needs-review',
    manuscript: 'A, B, C',
    note: 'Q1 du projet est une auto-évaluation (4 options A–D, pas de multi). Clé non appliquée.',
  },
  {
    questionId: 'Q2',
    status: 'checked',
    manuscript: 'A, B, C',
    note: 'Choix multiples A, B, C selon consigne de passation.',
  },
  {
    questionId: 'Q18',
    status: 'checked',
    manuscript: 'A, C',
    note: 'Choix multiples A et C. Comptée en C2.',
  },
  {
    questionId: 'Q7–Q15',
    status: 'needs-review',
    manuscript: 'figure originale shared-i.png',
    note: 'Fichier public/images/geometry/symetrie-axiale/shared-i.png absent du dépôt. SVG de secours avec axe (GH) affiché. À remplacer par la figure originale dès qu’elle est disponible.',
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
