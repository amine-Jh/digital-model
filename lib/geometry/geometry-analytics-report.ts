/**
 * Structured end-of-test analytics for geometry lessons:
 * parts (Partie I–III), capacities Cₖ, global level & recommendations.
 * Stored in `test_sessions.metadata.geometryAnalytics` (+ optional normalized tables).
 */

import { getCapacityLabelMap } from '@/lib/geometry/capacity-definitions'
import {
  canonicalPartLabel,
  getCanonicalPartIndex,
  type CanonicalPart,
} from '@/lib/geometry/geometry-partition'

export const GEOMETRY_ANALYTICS_SCHEMA_VERSION = 1 as const

export type GeometryPartAnalytics = {
  part: CanonicalPart
  label: string
  earned: number
  max: number
  percent: number
  scoreOutOf20: number
  meanPerQuestion: number
  correctCount: number
  totalScorable: number
}

export type GeometryCapacityAnalytics = {
  code: string
  name: string
  earned: number
  max: number
  percent: number
  scoreOutOf20: number
  meanPerQuestion: number
}

export type GeometryAnalyticsReport = {
  schemaVersion: typeof GEOMETRY_ANALYTICS_SCHEMA_VERSION
  testId: string
  globalPercent: number
  globalScoreOutOf20: number
  globalLevel: string
  globalLevelDetail: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  parts: GeometryPartAnalytics[]
  capacities: GeometryCapacityAnalytics[]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function pctTo20(p: number): number {
  return round1((p / 100) * 20)
}

function globalLevelFr(percent: number): { level: string; detail: string } {
  if (percent >= 85)
    return {
      level: 'Excellent',
      detail: 'Maîtrise solide des objectifs du test ; poursuivre avec des problèmes plus ouverts.',
    }
  if (percent >= 70)
    return {
      level: 'Bon',
      detail: 'Les bases sont acquises ; consolider les situations les moins réussies.',
    }
  if (percent >= 50)
    return {
      level: 'Moyen',
      detail: 'Des écarts notables subsistent ; viser la remediation ciblée sur les parties faibles.',
    }
  return {
    level: 'Fragile',
    detail: 'Reprendre les notions fondamentales et les exercices guidés avant d’approfondir.',
  }
}

function splitWeight(codes: string[]): number {
  const n = codes.filter(Boolean).length
  return n > 0 ? 1 / n : 1
}

export type GeometryQuestionForAnalytics = {
  id: string
  number?: number
  part?: string
  typeCode?: number
  competencies?: string[]
  competency?: string | null
  points?: number
  correctAnswer?: number | number[] | null
}

export type GeometryTrialForAnalytics = {
  index: number
  questionId: string
  correct: boolean
  score?: number
  pointsEarned?: number
}

export function buildGeometryAnalyticsReport(opts: {
  testId: string
  questions: GeometryQuestionForAnalytics[]
  trials: GeometryTrialForAnalytics[]
  isScorableIndex: (index: number) => boolean
  /** `fraction`: each item score in [0,1], max 1. `points`: use question.points and trial.pointsEarned. */
  scoringMode: 'fraction' | 'points'
}): GeometryAnalyticsReport {
  const { testId, questions, trials, isScorableIndex, scoringMode } = opts
  const labelMap = getCapacityLabelMap(testId)

  type Item = {
    part: CanonicalPart | null
    capacityCodes: string[]
    earned: number
    max: number
    correct: boolean
  }

  const items: Item[] = []

  for (const t of trials) {
    if (!isScorableIndex(t.index)) continue
    const q = questions[t.index]
    if (!q) continue

    let earned = 0
    let max = 1
    if (scoringMode === 'points') {
      max = typeof q.points === 'number' && q.points > 0 ? q.points : 0
      earned = typeof t.pointsEarned === 'number' ? t.pointsEarned : 0
    } else {
      max = 1
      earned =
        typeof t.score === 'number' && Number.isFinite(t.score)
          ? Math.max(0, Math.min(1, t.score))
          : t.correct
            ? 1
            : 0
    }
    if (max <= 0 && scoringMode === 'points') continue

    const codes: string[] = []
    if (q.competency) codes.push(q.competency)
    else if (q.competencies?.length) codes.push(...q.competencies)

    items.push({
      part: getCanonicalPartIndex(testId, q),
      capacityCodes: codes,
      earned,
      max: scoringMode === 'points' ? max : 1,
      correct: Boolean(t.correct),
    })
  }

  let totalEarned = 0
  let totalMax = 0
  for (const it of items) {
    totalEarned += it.earned
    totalMax += it.max
  }
  const globalPercent =
    totalMax > 0 ? Math.round((totalEarned / totalMax) * 10000) / 100 : 0
  const globalScoreOutOf20 = pctTo20(globalPercent)
  const { level, detail } = globalLevelFr(globalPercent)

  const partBuckets: Record<
    CanonicalPart,
    { earned: number; max: number; correct: number; n: number }
  > = {
    1: { earned: 0, max: 0, correct: 0, n: 0 },
    2: { earned: 0, max: 0, correct: 0, n: 0 },
    3: { earned: 0, max: 0, correct: 0, n: 0 },
  }

  for (const it of items) {
    if (it.part == null) continue
    const b = partBuckets[it.part]
    b.earned += it.earned
    b.max += it.max
    b.n += 1
    if (it.correct) b.correct += 1
  }

  const parts: GeometryPartAnalytics[] = ([1, 2, 3] as const)
    .map((part) => {
      const b = partBuckets[part]
      if (b.n === 0 && b.max === 0) return null
      const percent = b.max > 0 ? Math.round((b.earned / b.max) * 10000) / 100 : 0
      return {
        part,
        label: canonicalPartLabel(testId, part),
        earned: round2(b.earned),
        max: round2(b.max),
        percent,
        scoreOutOf20: pctTo20(percent),
        meanPerQuestion: b.n > 0 ? round2(b.earned / b.n) : 0,
        correctCount: b.correct,
        totalScorable: b.n,
      } satisfies GeometryPartAnalytics
    })
    .filter((x): x is GeometryPartAnalytics => x != null)

  const capBuckets: Record<string, { earned: number; max: number; questionUnits: number }> = {}
  for (const it of items) {
    const codes = it.capacityCodes.length ? it.capacityCodes : []
    const w = splitWeight(codes)
    if (!codes.length) continue
    for (const c of codes) {
      if (!capBuckets[c]) capBuckets[c] = { earned: 0, max: 0, questionUnits: 0 }
      capBuckets[c].earned += it.earned * w
      capBuckets[c].max += it.max * w
      capBuckets[c].questionUnits += w
    }
  }

  const capacities: GeometryCapacityAnalytics[] = Object.entries(capBuckets)
    .map(([code, v]) => {
      const percent = v.max > 0 ? Math.round((v.earned / v.max) * 10000) / 100 : 0
      return {
        code,
        name: labelMap[code] ?? code,
        earned: round2(v.earned),
        max: round2(v.max),
        percent,
        scoreOutOf20: pctTo20(percent),
        meanPerQuestion:
          v.questionUnits > 0 ? round2(v.earned / v.questionUnits) : 0,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  const sortedCaps = [...capacities].sort((a, b) => a.percent - b.percent)
  const weaknesses =
    sortedCaps.length > 0
      ? sortedCaps.slice(0, 2).map((c) => `${c.code} (${c.percent}%)`)
      : []
  const strengths =
    capacities.length > 0
      ? [...capacities]
          .sort((a, b) => b.percent - a.percent)
          .slice(0, 2)
          .map((c) => `${c.code} (${c.percent}%)`)
      : []

  const recommendations: string[] = [detail]
  const weakest = sortedCaps[0]
  if (weakest && weakest.percent < 60) {
    recommendations.push(
      `Priorité : retravailler ${weakest.name} (≈ ${weakest.percent} %).`,
    )
  }
  const weakestPart = [...parts].sort((a, b) => a.percent - b.percent)[0]
  if (weakestPart && weakestPart.percent < 60 && parts.length > 1) {
    recommendations.push(
      `Renforcer ${weakestPart.label.split('—')[0]?.trim() ?? 'la partie la plus faible'} (${weakestPart.percent} %).`,
    )
  }

  return {
    schemaVersion: GEOMETRY_ANALYTICS_SCHEMA_VERSION,
    testId,
    globalPercent,
    globalScoreOutOf20,
    globalLevel: level,
    globalLevelDetail: detail,
    strengths,
    weaknesses,
    recommendations,
    parts,
    capacities,
  }
}

export function parseGeometryAnalyticsReport(
  raw: unknown,
): GeometryAnalyticsReport | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.schemaVersion !== GEOMETRY_ANALYTICS_SCHEMA_VERSION) return null
  if (typeof o.testId !== 'string') return null
  if (!Array.isArray(o.parts) || !Array.isArray(o.capacities)) return null
  return raw as GeometryAnalyticsReport
}

/** One-line summary for dashboards (e.g. "P1 72% · P2 61%"). */
export function formatGeometryPartsSummary(report: GeometryAnalyticsReport): string {
  if (!report.parts.length) return ''
  return report.parts.map((p) => `P${p.part} ${Math.round(p.percent)}%`).join(' · ')
}
