/**
 * Géométrie dans l'espace : volumes — Tronc commun scientifique.
 *
 * Partie I   Q1–Q5   cours
 * Partie II  Q6–Q10  application
 * Partie III Q11–Q15 raisonnement (non publiée tant que photo + clé absentes)
 *
 * Capacités Cₖ : champ `competencies` prévu, codes/intitulés non inventés.
 */

export const SPACE_VOLUMES_TEST_ID = 'test-geo-space-volumes'
export const SPACE_VOLUMES_RESULTS_KEY = 'space-volumes:results'

export type SpaceVolumesPart = 'course' | 'application' | 'reasoning'

export type SpaceVolumesFigure =
  | 'cube-4'
  | 'pyramid-6-5'
  | 'cylinder-3-5'
  | 'photo-q11'
  | 'photo-q12'
  | 'photo-q13'
  | 'photo-q14'
  | 'photo-q15'

export interface SpaceVolumesQuestion {
  id: string
  number: number
  /** Codes Cₖ locaux — laisser vide jusqu’à communication officielle. */
  competencies: string[]
  question: string
  options: string[]
  /** Brouillon de propositions (Q11–Q15) — jamais affiché aux élèves. */
  draftOptions?: string[]
  correctAnswer: number | number[] | null
  part: SpaceVolumesPart
  points: number
  requiresImage: boolean
  figure?: SpaceVolumesFigure
  /** Fichier attendu sous public/ (Q11–Q15). */
  imagePath?: string
  published: boolean
  keyVerified: boolean
  correction?: string
}

export interface SpaceVolumesTrialResult {
  index: number
  questionId: string
  selected: number[]
  correct: boolean
  score: number
  pointsEarned: number
  reactionTimeMs: number
}

export interface SpaceVolumesResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: SpaceVolumesTrialResult[]
  totalMs: number
  correctCount: number
  score: number
  scorePoints: number
  maxScorePoints: number
}

const PHOTO_PLACEHOLDER = 'À définir après réception de la photographie.'

export const SPACE_VOLUMES_QUESTIONS: SpaceVolumesQuestion[] = [
  {
    id: 'Q1',
    number: 1,
    competencies: [],
    question:
      'Quelle est la formule permettant de calculer le volume d\'un cube de côté \\( a \\) ?',
    options: ['\\( V=a^3 \\)', '\\( V=3a^2 \\)', '\\( V=6a^2 \\)'],
    correctAnswer: 0,
    part: 'course',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : A. \\( V=a^3 \\).',
  },
  {
    id: 'Q2',
    number: 2,
    competencies: [],
    question:
      'Quelle est la formule permettant de calculer le volume d\'une pyramide de hauteur \\( h \\) et d\'aire de base \\( B \\) ? (\\( B \\) désigne l\'aire de la base.)',
    options: [
      '\\( V=B\\times h \\)',
      '\\( V=\\dfrac{1}{3}B\\times h \\)',
      '\\( V=\\dfrac{1}{2}B\\times h \\)',
    ],
    correctAnswer: 1,
    part: 'course',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : B. \\( V=\\frac{1}{3}Bh \\).',
  },
  {
    id: 'Q3',
    number: 3,
    competencies: [],
    question:
      'Quelle est la formule permettant de calculer le volume d\'un cylindre de rayon \\( r \\) et de hauteur \\( h \\) ?',
    options: [
      '\\( V=\\pi rh \\)',
      '\\( V=2\\pi r^2h \\)',
      '\\( V=\\pi r^2h \\)',
    ],
    correctAnswer: 2,
    part: 'course',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : C. \\( V=\\pi r^2 h \\).',
  },
  {
    id: 'Q4',
    number: 4,
    competencies: [],
    question:
      'Lorsqu\'une figure plane subit un agrandissement de rapport \\( k \\), par quel facteur son aire est-elle multipliée ?',
    options: ['\\( k \\)', '\\( k^2 \\)', '\\( k^3 \\)'],
    correctAnswer: 1,
    part: 'course',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : B. Les aires sont multipliées par \\( k^2 \\).',
  },
  {
    id: 'Q5',
    number: 5,
    competencies: [],
    question:
      'Lorsqu\'un solide subit un agrandissement de rapport \\( k \\), par quel facteur son volume est-il multiplié ?',
    options: ['\\( k \\)', '\\( k^2 \\)', '\\( k^3 \\)'],
    correctAnswer: 2,
    part: 'course',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : C. Les volumes sont multipliés par \\( k^3 \\).',
  },
  {
    id: 'Q6',
    number: 6,
    competencies: [],
    question:
      'Le cube ci-dessous a toutes ses arêtes de longueur \\( 4\\text{ cm} \\). Calculer son volume.',
    options: [
      '\\( 48\\text{ cm}^3 \\)',
      '\\( 64\\text{ cm}^3 \\)',
      '\\( 60\\text{ cm}^3 \\)',
    ],
    correctAnswer: 1,
    part: 'application',
    points: 1,
    requiresImage: true,
    figure: 'cube-4',
    published: true,
    keyVerified: true,
    correction: 'Réponse correcte : B. \\( V=4^3=64\\text{ cm}^3 \\).',
  },
  {
    id: 'Q7',
    number: 7,
    competencies: [],
    question:
      'La pyramide ci-dessous a une base carrée de côté \\( 6\\text{ cm} \\) et une hauteur perpendiculaire à la base de \\( 5\\text{ cm} \\). Calculer son volume.',
    options: [
      '\\( 60\\text{ cm}^3 \\)',
      '\\( 180\\text{ cm}^3 \\)',
      '\\( 90\\text{ cm}^3 \\)',
    ],
    correctAnswer: 0,
    part: 'application',
    points: 1,
    requiresImage: true,
    figure: 'pyramid-6-5',
    published: true,
    keyVerified: true,
    correction:
      'Réponse correcte : A. \\( B=6^2=36 \\), \\( V=\\frac{1}{3}\\times 36\\times 5=60\\text{ cm}^3 \\).',
  },
  {
    id: 'Q8',
    number: 8,
    competencies: [],
    question:
      'Le cylindre ci-dessous a un rayon de \\( 3\\text{ cm} \\) et une hauteur de \\( 5\\text{ cm} \\). Calculer son volume.',
    options: [
      '\\( 30\\pi\\text{ cm}^3 \\)',
      '\\( 45\\pi\\text{ cm}^3 \\)',
      '\\( 15\\pi\\text{ cm}^3 \\)',
    ],
    correctAnswer: 1,
    part: 'application',
    points: 1,
    requiresImage: true,
    figure: 'cylinder-3-5',
    published: true,
    keyVerified: true,
    correction:
      'Réponse correcte : B. \\( V=\\pi r^2 h=\\pi\\times 9\\times 5=45\\pi\\text{ cm}^3 \\).',
  },
  {
    id: 'Q9',
    number: 9,
    competencies: [],
    question:
      'Une figure plane possède initialement une aire de \\( 18\\text{ cm}^2 \\). On effectue un agrandissement de rapport \\( k=2 \\). Quelle est l\'aire de la figure agrandie ?',
    options: [
      '\\( 36\\text{ cm}^2 \\)',
      '\\( 54\\text{ cm}^2 \\)',
      '\\( 72\\text{ cm}^2 \\)',
    ],
    correctAnswer: 2,
    part: 'application',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction:
      'Réponse correcte : C. Facteur d\'aire \\( k^2=4 \\), donc \\( 18\\times 4=72\\text{ cm}^2 \\).',
  },
  {
    id: 'Q10',
    number: 10,
    competencies: [],
    question:
      'Une pyramide possède initialement un volume de \\( 24\\text{ cm}^3 \\). Toutes ses dimensions linéaires sont multipliées par \\( k=2 \\). Quel est le volume de la pyramide agrandie ?',
    options: [
      '\\( 48\\text{ cm}^3 \\)',
      '\\( 192\\text{ cm}^3 \\)',
      '\\( 96\\text{ cm}^3 \\)',
    ],
    correctAnswer: 1,
    part: 'application',
    points: 1,
    requiresImage: false,
    published: true,
    keyVerified: true,
    correction:
      'Réponse correcte : B. Facteur de volume \\( k^3=8 \\) (et non \\( k^2 \\)), donc \\( 24\\times 8=192\\text{ cm}^3 \\).',
  },
  {
    id: 'Q11',
    number: 11,
    competencies: [],
    question: 'Calculer le rapport de réduction indiqué dans la figure.',
    options: [],
    draftOptions: [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
    correctAnswer: null,
    part: 'reasoning',
    points: 2,
    requiresImage: true,
    figure: 'photo-q11',
    imagePath: '/images/geometry/space-volumes/q11.jpg',
    published: false,
    keyVerified: false,
  },
  {
    id: 'Q12',
    number: 12,
    competencies: [],
    question: 'Calculer l\'aire du rectangle représenté dans la figure.',
    options: [],
    draftOptions: [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
    correctAnswer: null,
    part: 'reasoning',
    points: 2,
    requiresImage: true,
    figure: 'photo-q12',
    imagePath: '/images/geometry/space-volumes/q12.jpg',
    published: false,
    keyVerified: false,
  },
  {
    id: 'Q13',
    number: 13,
    competencies: [],
    question:
      'En déduire l\'aire du quadrilatère représenté dans la figure, en utilisant les informations géométriques disponibles.',
    options: [],
    draftOptions: [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
    correctAnswer: null,
    part: 'reasoning',
    points: 2,
    requiresImage: true,
    figure: 'photo-q13',
    imagePath: '/images/geometry/space-volumes/q13.jpg',
    published: false,
    keyVerified: false,
  },
  {
    id: 'Q14',
    number: 14,
    competencies: [],
    question: 'Calculer le volume de la pyramide représentée dans la figure.',
    options: [],
    draftOptions: [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
    correctAnswer: null,
    part: 'reasoning',
    points: 2,
    requiresImage: true,
    figure: 'photo-q14',
    imagePath: '/images/geometry/space-volumes/q14.jpg',
    published: false,
    keyVerified: false,
  },
  {
    id: 'Q15',
    number: 15,
    competencies: [],
    question:
      'En déduire le volume de la pyramide représentée dans la figure, en utilisant les résultats et les relations géométriques établis précédemment lorsque cela est pertinent.',
    options: [],
    draftOptions: [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
    correctAnswer: null,
    part: 'reasoning',
    points: 2,
    requiresImage: true,
    figure: 'photo-q15',
    imagePath: '/images/geometry/space-volumes/q15.jpg',
    published: false,
    keyVerified: false,
  },
]

/** Prête pour les élèves : 3 choix, clé vérifiée, pas de brouillon « à définir ». */
export function isSpaceVolumesLive(q: SpaceVolumesQuestion): boolean {
  if (q.published !== true) return false
  if (q.keyVerified !== true) return false
  if (q.correctAnswer === null) return false
  if (q.options.length !== 3) return false
  if (q.options.some((o) => !o.trim() || /à définir/i.test(o))) return false
  return true
}

export const SPACE_VOLUMES_LIVE_QUESTIONS = SPACE_VOLUMES_QUESTIONS.filter(
  isSpaceVolumesLive,
)

export function listSpaceVolumesResults(): SpaceVolumesResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SPACE_VOLUMES_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as SpaceVolumesResult[]) : []
  } catch {
    return []
  }
}

export function saveSpaceVolumesResult(r: SpaceVolumesResult) {
  if (typeof window === 'undefined') return
  const all = listSpaceVolumesResults()
  all.push(r)
  window.localStorage.setItem(SPACE_VOLUMES_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('space-volumes-changed'))
}

export function getLatestSpaceVolumesResult(
  userName?: string,
): SpaceVolumesResult | undefined {
  const all = listSpaceVolumesResults()
    .filter((r) => !userName || r.userName === userName)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  return all[0]
}
