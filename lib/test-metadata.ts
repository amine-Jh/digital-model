/** Theoretical introduction & instructions per test — used by the generic test shell. */

export interface TestTheoreticalMeta {
  definition: string
  background: string
  author: string
  source: string
  objective: string
  instructions: string
}

const defaultMeta: TestTheoreticalMeta = {
  definition:
    'A standardized cognitive or academic task measuring specific capacities through structured items.',
  background:
    'Based on psychometric and educational measurement principles; adapted for digital administration.',
  author: 'Research platform (adaptation)',
  source: 'Internal documentation / published test manuals where applicable',
  objective:
    'Quantify performance for feedback, research, and instructional planning.',
  instructions:
    'Answer each item carefully. Use Next to move forward. You must accept the instructions before starting. Scores are computed after submission.',
}

const byTest: Record<string, Partial<TestTheoreticalMeta>> = {
  'test-mental-rotation-2d': {
    definition:
      '2D mental rotation is the ability to mentally rotate a planar figure and recognise it among candidate figures presented at different orientations.',
    background:
      'Two-dimensional mental rotation tasks (Collins & Kimura, 1997) measure the speed and accuracy of imagined planar transformations and are widely used in cognitive and developmental psychology.',
    author: 'Adapted from Collins & Kimura (1997) — 2D mental rotation paradigm',
    source: 'Internal adaptation for the CogniTest platform',
    objective:
      'Quantify 2D mental rotation accuracy through a binary forced-choice (LEFT / RIGHT) over 19 items.',
    instructions:
      'Le test comporte 19 questions. Pour chaque écran, observez la figure de référence puis choisissez LEFT ou RIGHT. Une seule réponse par question, pas de retour en arrière. Durée totale : 15 minutes. Choisissez aussi rapidement et précisément que possible.',
  },
  'test-selective-attention': {
    definition:
      'Selective attention is the ability to focus on task-relevant stimuli while ignoring distractors.',
    background:
      'Related to Stroop-like interference and executive control over automatic responses.',
    objective: 'Assess selective attention and inhibitory control under interference.',
  },
  'test-geo-central-sym': {
    definition: 'La symétrie centrale par rapport à un point O est une transformation géométrique qui à tout point M associe le point M\' tel que O est le milieu de [MM\'].',
    background: 'La symétrie centrale est une isométrie indirecte. Elle conserve les distances, les angles et les longueurs. Elle est fondamentale pour comprendre les figures symétriques.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise de la symétrie centrale et ses propriétés invariantes dans le plan.',
    instructions: 'Lisez chaque question attentivement. Pour chaque item, sélectionnez la réponse correcte parmi les quatre propositions. Chaque question est associée à une compétence (Cₖ) spécifique.',
  },
  'test-geo-symetrie-axiale': {
    definition: 'La symétrie axiale par rapport à une droite d est une transformation qui à tout point M associe son symétrique M\' tel que d est la médiatrice de [MM\'].',
    background: 'La symétrie axiale est une isométrie indirecte qui inverse l\'orientation. La composée de deux symétries axiales d\'axes parallèles est une translation.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise de la symétrie axiale et la compréhension des isométries du plan.',
    instructions: 'Lisez chaque question attentivement. Certaines questions admettent plusieurs réponses correctes — cochez toutes les bonnes options. Q7 et Q8 portent sur l’axe (GH). Chaque question notée est associée à une compétence (Cₖ).',
  },
  'test-geo-vectors-complete': {
    definition: 'Un vecteur est défini par une direction, un sens et une norme. La translation de vecteur \\( \\vec{u} \\) est la transformation qui à tout point M associe M\' tel que \\( \\vec{MM\'} = \\vec{u} \\).',
    background: 'Les vecteurs et la translation sont au cœur du calcul vectoriel au lycée. La relation de Chasles, la colinéarité et l\'égalité vectorielle sont des notions fondamentales pour la géométrie analytique.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise des concepts de vecteurs, de la relation de Chasles, de la colinéarité, de l\'égalité vectorielle et des propriétés de la translation (compétences C1, C2, C4).',
    instructions: 'Le test débute par une auto-évaluation, suivie de 8 questions de cours. Certaines questions admettent plusieurs réponses correctes — sélectionnez toutes les bonnes réponses avant de valider.',
  },
  'test-geo-trig-circle': {
    definition: 'Le cercle trigonométrique est le cercle de centre O et de rayon 1. Pour un angle \\( \\theta \\), le point M associé a pour coordonnées \\( (\\cos\\theta, \\sin\\theta) \\).',
    background: 'Le cercle trigonométrique permet de visualiser les valeurs de cos et sin pour tout angle réel, et de comprendre la périodicité, la parité et les angles associés.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la capacité à placer des points sur le cercle trigonométrique (C1), à interpréter les projections cos et sin (C1), et à calculer des valeurs trigonométriques exactes (C2).',
    instructions: 'Le test comporte 3 questions avec plusieurs sous-questions. Toutes les sous-questions doivent être traitées. Une seule tentative par sous-question — la validation est immédiate.',
  },
  'test-geo-space': {
    definition: 'La géométrie dans l\'espace étudie les positions relatives des points, droites et plans : incidence, parallélisme, orthogonalité et configurations de référence (cube, tétraèdre).',
    background: 'Axiomes d\'incidence (deux points définissent une droite ; trois points non alignés définissent un plan), théorème du toit, orthogonalité d\'une droite et d\'un plan, parallélisme des plans.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise des axiomes de la géométrie dans l\'espace (C1), des positions relatives (C2) et des configurations de référence telles que cube et tétraèdre (C3).',
    instructions: 'Le test comporte 28 questions : Partie I (Q1–Q18) questions du cours, Partie II (Q19–Q28) questions de raisonnement. Certaines questions admettent plusieurs réponses correctes — cochez toutes les bonnes options.',
  },
  'test-geo-produit-scalaire': {
    definition: 'Le produit scalaire de deux vecteurs \\( \\vec{U} \\) et \\( \\vec{V} \\) est défini par \\( \\vec{U}\\cdot\\vec{V} = \\|\\vec{U}\\|\\,\\|\\vec{V}\\|\\cos(\\widehat{(\\vec{U},\\vec{V})}) \\), ou en repère orthonormé par \\( ab + cd \\) avec \\( \\vec{U}(a,c) \\) et \\( \\vec{V}(b,d) \\).',
    background: 'Le produit scalaire est l\'outil clé pour passer de la géométrie vectorielle à la géométrie analytique : théorèmes d\'Al-Kashi et de la médiane, équations cartésiennes de droites et de cercles, distances et projections orthogonales en découlent directement.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise du produit scalaire (C1, C3, C6) et des outils de géométrie analytique (C2, C4, C5) : équations de droites et cercles, distances, projections, angles.',
    instructions: 'Le test comporte 27 questions réparties en 3 parties (cours, visualisation, raisonnement). Certaines questions admettent plusieurs bonnes réponses (cases à cocher) et quelques questions ouvertes ne sont pas notées automatiquement.',
  },
  'test-geo-space-volumes': {
    definition:
      'Les volumes des solides usuels (cube, pyramide, cylindre) et l’effet d’un agrandissement de rapport k sur les aires (k²) et les volumes (k³).',
    background:
      'Programme de géométrie dans l’espace : formules de volume et facteurs d’agrandissement / réduction.',
    author: 'Programme national marocain — Tronc commun scientifique',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective:
      'Évaluer le calcul des volumes et l’utilisation des facteurs k² (aires) et k³ (volumes). Les capacités Cₖ seront renseignées lorsqu’elles seront communiquées.',
    instructions:
      'Q1–Q5 cours, Q6–Q10 application (figures pour Q6–Q8). Q11–Q15 (raisonnement) ne sont proposées aux élèves que lorsque photographies et clés sont configurées. Trois choix A, B, C par question publiée.',
  },
  'test-geo-line-plane': {
    definition: 'Une droite dans le plan est caractérisée par une équation de la forme y = mx + b (pente m, ordonnée à l\'origine b) ou ax + by + c = 0 (forme générale).',
    background: 'L\'étude des droites dans le plan est au cœur de la géométrie analytique. Pentes, parallélisme, perpendicularité, distance et intersection sont les notions clés.',
    author: 'Programme national marocain — 1ère Bac Sciences',
    source: 'Manuels scolaires marocains, programme MENFP',
    objective: 'Évaluer la maîtrise des équations de droites, du parallélisme, de la perpendicularité, de la distance point-droite et des intersections (C1, C2).',
    instructions:
      'Q1 auto-évaluation (hors barème). Q2 à réponses multiples. Q3 affiche les coordonnées et l’équation, sans placement. Q10 Oui/Non sans justification. Q11 notée (droite parallèle, option A).',
  },
}

export function getTestMetadata(testId: string): TestTheoreticalMeta {
  const extra = byTest[testId] ?? {}
  return { ...defaultMeta, ...extra }
}
