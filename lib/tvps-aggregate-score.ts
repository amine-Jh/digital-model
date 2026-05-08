/**
 * TVPS-3 composite: mean of available subtest scores linked to the
 * `test-visuo-perceptive` battery (`VP_SUBTESTS`).
 */

import { VP_SUBTESTS, resultStorageKey, type VPSubtestId } from '@/lib/visuo-perceptive'
import type { TestWithProgress } from '@/lib/student-test-progress'

export const TVPS_HUB_TEST_ID = 'test-visuo-perceptive'

/** Subtest test_ids (excludes the hub). */
export function tvpsSubtestIds(): string[] {
  return VP_SUBTESTS.map((s) => s.testId)
}

/**
 * One value per subtest: prefer latest completed Supabase score, else browser localStorage.
 */
export function computeTvps3MeanPercent(merged: TestWithProgress[]): number | null {
  const values: number[] = []
  for (const meta of VP_SUBTESTS) {
    const t = merged.find((x) => x.id === meta.testId)
    if (t?.status === 'completed' && t.latestScore != null) {
      values.push(t.latestScore)
      continue
    }
    if (typeof window === 'undefined') continue
    try {
      const raw = window.localStorage.getItem(resultStorageKey(meta.id as VPSubtestId))
      if (!raw) continue
      const parsed = JSON.parse(raw) as { percentage?: number }
      if (typeof parsed.percentage === 'number' && Number.isFinite(parsed.percentage)) {
        values.push(parsed.percentage)
      }
    } catch {
      /* skip */
    }
  }
  if (values.length === 0) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

/** Cohort pool mean of completed VP subtest sessions (all students, all attempts). */
export function cohortTvps3MeanFromSessions(
  sessions: Array<{ test_id: string; status: string; score: number | null }>,
): number | null {
  const ids = new Set(tvpsSubtestIds())
  const scores = sessions
    .filter((s) => s.status === 'completed' && s.score != null && ids.has(s.test_id))
    .map((s) => Number(s.score))
  if (scores.length === 0) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}
