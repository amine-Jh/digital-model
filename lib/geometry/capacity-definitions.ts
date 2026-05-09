/**
 * Canonical Cₖ definitions per geometry lesson (`testId`).
 * Convention: codes C1, C2, … are LOCAL to each lesson — always join analytics on (test_id, code).
 */

export interface CapacityDef {
  code: string
  label: string
}

/** Keys = `public.tests.id` / `*_TEST_ID` constants. */
export const CAPACITIES_BY_TEST: Record<string, CapacityDef[]> = {
  'test-geo-vectors-complete': [
    {
      code: 'C1',
      label:
        'la construction d’un vecteur sous la forme de \\( A\\vec{u} + B\\vec{v} \\)',
    },
    {
      code: 'C2',
      label:
        'l’expression des concepts et des propriétés géométriques affines en utilisant l’outil vectoriel et inversement',
    },
    {
      code: 'C3',
      label:
        'la résolution des problèmes géométriques à l’aide de l’outil vectoriel',
    },
    {
      code: 'C4',
      label:
        'reconnaître la similarité des formes géométriques à l’aide de la translation',
    },
    {
      code: 'C5',
      label:
        'l’utilisation de la translation dans la résolution des problèmes géométriques',
    },
  ],
  'test-geo-space': [
    {
      code: 'C1',
      label: 'représentation des parties de l’espace sur le plan',
    },
    {
      code: 'C2',
      label:
        'compréhension des similarités et dissimilarités entre le plan et l’espace',
    },
    {
      code: 'C3',
      label:
        'utilisation des propriétés de la géométrie de l’espace dans la résolution de problèmes',
    },
  ],
  'test-geo-symetrie-axiale': [
    {
      code: 'C1',
      label: 'reconnaissance de la similarité des formes géométriques',
    },
    {
      code: 'C2',
      label: 'utilisation de la symétrie axiale dans la résolution de problèmes',
    },
  ],
  'test-geo-central-sym': [
    {
      code: 'C1',
      label: 'reconnaissance de la similarité des formes géométriques',
    },
    {
      code: 'C2',
      label: 'utilisation de la symétrie centrale dans la résolution de problèmes',
    },
  ],
  'test-geo-line-plane': [
    {
      code: 'C1',
      label:
        'traduction des concepts de la géométrie affine et vectorielle à l’aide des coordonnées',
    },
    {
      code: 'C2',
      label:
        'utilisation des outils analytiques pour étudier la colinéarité et l’alignement des points',
    },
  ],
  'test-geo-trig-circle': [
    {
      code: 'C1',
      label:
        'représentation des angles à l’aide des abscisses curvilignes et identification du cosinus et du sinus d’un angle',
    },
  ],
  'test-geo-produit-scalaire': [
    {
      code: 'C1',
      label: 'calcul des distances et des angles à l’aide du produit scalaire',
    },
    {
      code: 'C2',
      label:
        "reconnaissance de l'ensemble des points vérifiant \\(\\vec{MA}\\cdot\\vec{MB}=0\\)",
    },
    {
      code: 'C3',
      label:
        'détermination du centre et du rayon d’un cercle à partir de son équation cartésienne',
    },
    {
      code: 'C4',
      label:
        'interprétation d’une représentation paramétrique et établissement de l’équation cartésienne correspondante',
    },
    {
      code: 'C5',
      label:
        'utilisation des propriétés analytiques du produit scalaire pour résoudre des problèmes géométriques',
    },
    {
      code: 'C6',
      label:
        'questions de raisonnement et démonstration géométrique avancée utilisant le produit scalaire',
    },
  ],
}

const SUB = '₁₂₃₄₅₆₇₈₉'

export function formatCapacityGlyph(code: string): string {
  const m = /^C(\d)$/.exec(code.trim())
  if (!m) return code
  const d = Number(m[1])
  if (d >= 1 && d <= 9) return `C${SUB[d - 1]}`
  return code
}

export function getCapacitiesForTestId(testId: string): CapacityDef[] {
  return CAPACITIES_BY_TEST[testId] ?? []
}

export function getCapacityLabelMap(testId: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const c of getCapacitiesForTestId(testId)) {
    map[c.code] = c.label
  }
  return map
}
