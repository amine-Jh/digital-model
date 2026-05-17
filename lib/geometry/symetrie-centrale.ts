/**
 * Symétrie centrale — Cognitive Assessment Test (version finale)
 * Domain: Cognition et apprentissage de la géométrie
 *
 * Référentiel pédagogique :
 *   - Programme national marocain — Tronc commun
 *   - Manuels scolaires marocains (MENFP)
 *
 * Compétences :
 *   C1 — Reconnaître les propriétés et figures liées à la symétrie centrale (Q2 → Q13)
 *   C2 — Utiliser la symétrie centrale dans la résolution de problèmes (Q14 → Q17)
 *
 * Barème :
 *   Auto-évaluations (AE1, AE2, AE3) : 0 pt — non comptées dans le score ni les moyennes
 *   Q2 → Q13  (C1)   : 1 pt chacune  → /12
 *   Q14 → Q17 (C2)   : 2 pts chacune → /8
 *   Total : 20 pts
 *
 * Navigation : linéaire stricte — pas de retour arrière une fois la
 * question validée (mode examen sécurisé).
 *
 * Spécificités :
 *   - Q7 → Q13 : figure commune avec centre I (clé 'shared-i')
 *   - Q16     : construction géométrique — choix entre 2 images
 *   - Q17     : figure obligatoire 'figure-iso'
 */

export const SYMETRIE_CENTRALE_TEST_ID = 'test-geo-central-sym'
export const SYMETRIE_CENTRALE_RESULTS_KEY = 'geo-symetrie-centrale:results'

export type QKind = 'mcq' | 'truefalse' | 'multi' | 'image-choice'
export type FigureKey = 'shared-i' | 'figure-iso'

export interface SymCentraleQuestion {
  id: string
  number: number
  competency: 'C1' | 'C2' | null
  kind: QKind
  question: string
  /** Text options. For 'image-choice' questions, leave empty and use `optionImages`. */
  options: string[]
  /** Single index, array of indices (multi-correct), or null (diagnostic). */
  correctAnswer: number | number[] | null
  /** Reusable figure key (Q7-Q13 share 'shared-i'; Q17 uses 'figure-iso'). */
  figure?: FigureKey
  /** When kind === 'image-choice', list of image URLs (one per option). */
  optionImages?: string[]
  /** Score weight (0 diagnostic, 1 for C1, 2 for C2). */
  points: number
  isDiagnostic?: boolean
  /** Auto-évaluations : jamais comptées dans le score ni les moyennes. */
  isAutoeval?: boolean
}

export interface SymCentraleTrialResult {
  index: number
  questionId: string
  selected: number[]
  correct: boolean
  pointsEarned: number
  reactionTimeMs: number
}

export interface SymCentraleResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  trials: SymCentraleTrialResult[]
  totalMs: number
  scoreC1: number
  maxC1: number
  scoreC2: number
  maxC2: number
  totalScore: number
  maxScore: number
  level: SymCentraleLevel
}

export type SymCentraleLevel = 'faible' | 'moyen' | 'bon' | 'excellent'

// ─── Questions ──────────────────────────────────────────────────────────────

export const SYMETRIE_CENTRALE_QUESTIONS: SymCentraleQuestion[] = [
  {
    id: 'AE1',
    number: -1,
    competency: null,
    kind: 'mcq',
    question:
      'À quel degré te rappelles-tu la leçon sur la symétrie centrale ?',
    options: [
      'J\'ai complètement oublié la leçon',
      'Je me rappelle de quelques notions seulement',
      'Je me rappelle globalement la leçon',
      'Je maîtrise bien la leçon',
    ],
    correctAnswer: null,
    points: 0,
    isAutoeval: true,
  },

  // ─── C1 : Reconnaître (Q2 → Q13) — 1 pt ───────────────────────────────────
  {
    id: 'Q2',
    number: 2,
    competency: 'C1',
    kind: 'mcq',
    question: 'La symétrie centrale conserve :',
    options: [
      'Les longueurs, les angles et l\'alignement des points',
      'Seulement les angles et l\'alignement des points',
      'Les périmètres et les aires uniquement',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    points: 1,
  },
  {
    id: 'Q3',
    number: 3,
    competency: 'C1',
    kind: 'multi',
    question:
      'Si \\( M \\) et \\( M\' \\) sont symétriques par rapport à \\( I \\), alors :',
    options: [
      'Les points \\( I,\\,M,\\,M\' \\) sont alignés',
      'Le point \\( I \\) est le milieu de \\( [MM\'] \\)',
      'Le segment \\( [MM\'] \\) est invariant par cette symétrie',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    points: 1,
  },
  {
    id: 'Q4',
    number: 4,
    competency: 'C1',
    kind: 'multi',
    question:
      'Si \\( E \\) et \\( F \\) sont les symétriques respectifs des points \\( A \\) et \\( B \\) par rapport à \\( O \\), alors :',
    options: [
      'Le segment \\( [AB] \\) est le symétrique du segment \\( [EF] \\) par rapport à \\( O \\)',
      '\\( AB = EF \\)',
      'Le quadrilatère \\( ABEF \\) peut être un parallélogramme',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1, 2],
    points: 1,
  },
  {
    id: 'Q5',
    number: 5,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Les images de trois points alignés par une symétrie centrale sont :',
    options: [
      'Trois points alignés',
      'Trois points non alignés',
      'Quatre points alignés',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    points: 1,
  },
  {
    id: 'Q6',
    number: 6,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Dans le parallélogramme \\( ABCD \\) de centre \\( O \\), l\'image de l\'angle \\( \\widehat{ABC} \\) par la symétrie centrale de centre \\( O \\) est :',
    options: [
      '\\( \\widehat{ADC} \\)',
      '\\( \\widehat{ABC} \\)',
      'Un autre angle de même mesure mais distinct',
      'Je ne sais pas',
    ],
    correctAnswer: 0,
    points: 1,
  },

  {
    id: 'AE2',
    number: -2,
    competency: null,
    kind: 'mcq',
    question:
      'Rencontres-tu des difficultés dans la construction des symétriques de points, segments ou figures par rapport à un centre ?',
    options: ['Oui', 'Non'],
    correctAnswer: null,
    points: 0,
    isAutoeval: true,
  },

  // ─── Q7 → Q13 : figure commune avec centre I ─────────────────────────────
  {
    id: 'Q7',
    number: 7,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous (centre \\( I \\)), parmi les affirmations suivantes, laquelle est vraie ?',
    options: [
      'Le symétrique du point \\( A \\) est le point \\( F \\) — faux',
      'Le symétrique du point \\( A \\) est le point \\( C \\) — vrai',
      'Le symétrique du point \\( G \\) est le point \\( H \\) — faux',
      'Aucune réponse',
    ],
    correctAnswer: 1,
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q8',
    number: 8,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous, le symétrique du segment \\( [AB] \\) par rapport à \\( I \\) est :',
    options: ['\\( [BC] \\)', '\\( [AD] \\)', '\\( [DC] \\)', 'Aucune réponse'],
    correctAnswer: 2,
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q9',
    number: 9,
    competency: 'C1',
    kind: 'multi',
    question:
      'Sur la figure ci-dessous, identifier les parallélogrammes (cocher tous ceux qui en sont) :',
    options: ['\\( ABCD \\)', '\\( AGFH \\)', '\\( EGFH \\)', 'Aucune réponse'],
    correctAnswer: [0, 2],
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q10',
    number: 10,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous, le symétrique de \\( \\widehat{BAD} \\) par rapport à \\( I \\) est :',
    options: [
      '\\( \\widehat{BCD} \\)',
      '\\( \\widehat{BAD} \\)',
      '\\( \\widehat{ADC} \\)',
      'Aucune réponse',
    ],
    correctAnswer: 0,
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q11',
    number: 11,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous, le symétrique de \\( \\widehat{BAC} \\) par rapport à \\( I \\) est :',
    options: [
      '\\( \\widehat{BAD} \\)',
      '\\( \\widehat{BCA} \\)',
      '\\( \\widehat{CAD} \\)',
      'Aucune réponse',
    ],
    correctAnswer: 1,
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q12',
    number: 12,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous, le symétrique de la droite \\( (GH) \\) par rapport à \\( I \\) est :',
    options: ['\\( (GH) \\)', '\\( (AC) \\)', '\\( (BD) \\)', 'Aucune réponse'],
    correctAnswer: 0,
    figure: 'shared-i',
    points: 1,
  },
  {
    id: 'Q13',
    number: 13,
    competency: 'C1',
    kind: 'mcq',
    question:
      'Sur la figure ci-dessous, le symétrique de la droite \\( (EG) \\) par rapport à \\( I \\) est :',
    options: ['\\( (GH) \\)', '\\( (FH) \\)', '\\( (CH) \\)', 'Aucune réponse'],
    correctAnswer: 1,
    figure: 'shared-i',
    points: 1,
  },

  {
    id: 'AE3',
    number: -3,
    competency: null,
    kind: 'mcq',
    question:
      'La démonstration dans la leçon de symétrie centrale est, pour toi :',
    options: ['Très facile', 'Facile', 'Difficile', 'Très difficile'],
    correctAnswer: null,
    points: 0,
    isAutoeval: true,
  },

  // ─── C2 : Résolution de problèmes (Q14 → Q17) — 2 pts ─────────────────────
  {
    id: 'Q14',
    number: 14,
    competency: 'C2',
    kind: 'multi',
    question:
      'Si \\( A \\) et \\( B \\) sont les symétriques respectifs de \\( M \\) et \\( N \\) par rapport à un même centre, cocher les affirmations correctes :',
    options: [
      '\\( ABMN \\) est un parallélogramme',
      'Les diagonales \\( [AM] \\) et \\( [BN] \\) se coupent en leur milieu',
      '\\( AN = AM \\)',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1],
    points: 2,
  },
  {
    id: 'Q15',
    number: 15,
    competency: 'C2',
    kind: 'multi',
    question:
      'Dans le rectangle \\( ABCD \\) de centre \\( O \\), \\( I \\) milieu de \\( [AB] \\) et \\( J \\) milieu de \\( [CD] \\). Cocher les affirmations correctes :',
    options: [
      '\\( I \\) est le symétrique de \\( J \\) par rapport à \\( O \\)',
      '\\( \\widehat{AOB} \\) est le symétrique de \\( \\widehat{DOC} \\) par rapport à \\( O \\)',
      '\\( [AB] \\) est le symétrique de \\( [CD] \\) par rapport à \\( I \\)',
      'Je ne sais pas',
    ],
    correctAnswer: [0, 1],
    points: 2,
  },
  {
    id: 'Q16',
    number: 16,
    competency: 'C2',
    kind: 'image-choice',
    question:
      'Soit \\( ABC \\) un triangle équilatéral tel que \\( AB = 6 \\). Soient \\( I \\) le milieu de \\( [AC] \\), \\( J \\) le milieu de \\( [AB] \\), \\( K \\) le milieu de \\( [BC] \\). On note \\( B\' \\) le symétrique de \\( B \\) par rapport à \\( I \\), \\( A\' \\) le symétrique de \\( A \\) par rapport à \\( K \\), et \\( C\' \\) le symétrique de \\( C \\) par rapport à \\( J \\). Choisir la figure qui représente correctement la construction.',
    options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'],
    optionImages: [
      '/images/geometry/symetrie-centrale/q16-option-1.png',
      '/images/geometry/symetrie-centrale/q16-option-2.png',
      '/images/geometry/symetrie-centrale/q16-option-3.png',
      '/images/geometry/symetrie-centrale/q16-option-4.png',
    ],
    correctAnswer: 0,
    points: 2,
  },
  {
    id: 'Q17',
    number: 17,
    competency: 'C2',
    kind: 'mcq',
    question:
      'En reprenant la construction précédente (avec \\( A\' \\), \\( B\' \\), \\( C\' \\) symétriques de \\( A \\), \\( B \\), \\( C \\) par rapport aux milieux des côtés), la nature du triangle \\( A\'B\'C\' \\) est :',
    options: [
      'Triangle isocèle',
      'Triangle quelconque',
      'Triangle équilatéral',
      'Triangle rectangle',
    ],
    correctAnswer: 2,
    figure: 'figure-iso',
    points: 2,
  },
]

// ─── Scoring helpers ────────────────────────────────────────────────────────

export function arrayEquals(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const as = [...a].sort()
  const bs = [...b].sort()
  return as.every((v, i) => v === bs[i])
}

export function gradeAnswer(q: SymCentraleQuestion, selected: number[]): boolean {
  if (q.correctAnswer === null) return false
  if (Array.isArray(q.correctAnswer)) {
    return arrayEquals(selected, q.correctAnswer)
  }
  return selected.length === 1 && selected[0] === q.correctAnswer
}

export function levelFor(total: number): SymCentraleLevel {
  if (total <= 7) return 'faible'
  if (total <= 13) return 'moyen'
  if (total <= 17) return 'bon'
  return 'excellent'
}

export const LEVEL_LABEL: Record<SymCentraleLevel, string> = {
  faible: 'Niveau faible',
  moyen: 'Niveau moyen',
  bon: 'Bon niveau',
  excellent: 'Excellent niveau',
}

export const LEVEL_INSIGHT: Record<SymCentraleLevel, string> = {
  faible:
    'Les notions fondamentales de la symétrie centrale ne sont pas encore acquises. Reprenez la définition (le centre est milieu de tout couple point–image) et les propriétés de conservation (longueurs, angles, alignement).',
  moyen:
    'Les bases sont posées mais les applications (parallélogrammes, configurations construites) demandent à être renforcées par des exercices ciblés.',
  bon:
    'Bonne maîtrise des propriétés et des configurations. Travailler les démonstrations et les problèmes ouverts pour consolider la compétence C2.',
  excellent:
    'Excellente maîtrise. Vous pouvez aborder des problèmes mêlant symétrie centrale, translation et rotation, ainsi que des configurations complexes.',
}

// ─── Result persistence ─────────────────────────────────────────────────────

export function listSymCentraleResults(): SymCentraleResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SYMETRIE_CENTRALE_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as SymCentraleResult[]) : []
  } catch {
    return []
  }
}

export function saveSymCentraleResult(r: SymCentraleResult) {
  if (typeof window === 'undefined') return
  const all = listSymCentraleResults()
  all.push(r)
  window.localStorage.setItem(SYMETRIE_CENTRALE_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('symetrie-centrale-changed'))
}
