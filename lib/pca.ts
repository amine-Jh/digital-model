/**
 * Principal Component Analysis (ACP) — simulated output for the research dashboard.
 *
 * NOTE: These values are theoretical placeholders based on published visual-spatial
 * cognition research (typical 3-component solutions). They will be replaced with
 * real factor loadings once data collection is complete.
 */

export interface PcaComponent {
  componentNumber: number
  label: string
  varianceExplained: number   // percentage
  cumulativeVariance: number  // percentage
  eigenvalue: number
}

export interface PcaLoading {
  variable: string
  variableFr: string
  pc1Loading: number
  pc2Loading: number
  pc3Loading: number
}

export interface PcaResult {
  components: PcaComponent[]
  loadings: PcaLoading[]
  totalVarianceExplained: number   // sum of first 3 components
  isSimulated: true
}

export function simulatePcaResult(): PcaResult {
  const components: PcaComponent[] = [
    { componentNumber: 1, label: 'CP1 — Visuo-spatial', varianceExplained: 35.2, cumulativeVariance: 35.2, eigenvalue: 2.46 },
    { componentNumber: 2, label: 'CP2 — Raisonnement', varianceExplained: 22.1, cumulativeVariance: 57.3, eigenvalue: 1.55 },
    { componentNumber: 3, label: 'CP3 — Mémoire/Attention', varianceExplained: 14.7, cumulativeVariance: 72.0, eigenvalue: 1.03 },
    { componentNumber: 4, label: 'CP4', varianceExplained: 8.3, cumulativeVariance: 80.3, eigenvalue: 0.58 },
    { componentNumber: 5, label: 'CP5', varianceExplained: 5.1, cumulativeVariance: 85.4, eigenvalue: 0.36 },
    { componentNumber: 6, label: 'CP6', varianceExplained: 3.8, cumulativeVariance: 89.2, eigenvalue: 0.27 },
    { componentNumber: 7, label: 'CP7', varianceExplained: 2.9, cumulativeVariance: 92.1, eigenvalue: 0.20 },
  ]

  // Loadings matrix: variables × PC1/PC2/PC3
  // Values based on visual-spatial + math performance research (Lohman 1996, Carroll 1993)
  const loadings: PcaLoading[] = [
    { variable: 'visual-processing',    variableFr: 'Traitement visuel',      pc1Loading:  0.82, pc2Loading:  0.15, pc3Loading:  0.21 },
    { variable: 'cognitive-capacity',   variableFr: 'Capacité cognitive (dont spatial)', pc1Loading:  0.78, pc2Loading:  0.31, pc3Loading:  0.14 },
    { variable: 'working-memory',       variableFr: 'Mémoire de travail',      pc1Loading:  0.42, pc2Loading:  0.61, pc3Loading:  0.48 },
    { variable: 'attention',            variableFr: 'Attention',               pc1Loading:  0.25, pc2Loading:  0.38, pc3Loading:  0.72 },
    { variable: 'reasoning',            variableFr: 'Raisonnement',            pc1Loading:  0.35, pc2Loading:  0.79, pc3Loading:  0.22 },
    { variable: 'executive-functions',  variableFr: 'Fonctions exécutives',    pc1Loading:  0.31, pc2Loading:  0.54, pc3Loading:  0.63 },
    { variable: 'mathematics',          variableFr: 'Performance mathématique', pc1Loading:  0.74, pc2Loading:  0.68, pc3Loading:  0.29 },
  ]

  return {
    components,
    loadings,
    totalVarianceExplained: 72.0,
    isSimulated: true,
  }
}
