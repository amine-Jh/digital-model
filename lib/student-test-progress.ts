/**
 * Merge catalogue tests (`Test[]`, usually from `public.tests` via `listTestsCatalog`)
 * with the current user's `test_sessions`
 * rows from Supabase for UI on /tests and /results.
 */

import type { Test } from '@/lib/mock-data'
import type { Database } from '@/lib/types/database'
import {
  parseGeometryAnalyticsReport,
  type GeometryAnalyticsReport,
} from '@/lib/geometry/geometry-analytics-report'

export type SessionStatus = Database['public']['Tables']['test_sessions']['Row']['status']

export type TestWithProgress = Test & {
  /** Derived from latest matching session (not mock status). */
  status: 'upcoming' | 'in-progress' | 'completed'
  /** Latest session score % when completed; null otherwise. */
  latestScore: number | null
  /** Latest session id when useful for links/debug. */
  latestSessionId?: string
  /** Structured geometry breakdown (parts + Cₖ) when present on the session row. */
  latestGeometryAnalytics?: GeometryAnalyticsReport | null
}

type SessionRow = Database['public']['Tables']['test_sessions']['Row']

function sessionEndMs(row: SessionRow): number {
  return new Date(row.completed_at ?? row.started_at).getTime()
}

/**
 * One row per `test_id` for dashboards / admin aggregates.
 *
 * We cannot use “newest started_at” alone: an abandoned `in-progress` row
 * that started *after* a completed attempt’s `started_at` but *before* its
 * `completed_at` would mask the completion and look like results vanished.
 *
 * Rule: if there is any completed session, use the latest completed (by
 * end time) unless there is a non-completed session that *started after* that
 * end (a genuine retake). Otherwise use the latest non-completed row.
 */
function representativeSessionForTest(rows: SessionRow[]): SessionRow | undefined {
  if (rows.length === 0) return undefined
  const completed = rows.filter((r) => r.status === 'completed')
  const incomplete = rows.filter((r) => r.status !== 'completed')

  let latestCompletedEnd = 0
  for (const r of completed) {
    const t = sessionEndMs(r)
    if (t > latestCompletedEnd) latestCompletedEnd = t
  }

  if (latestCompletedEnd > 0) {
    const retryOpen = incomplete.filter(
      (r) => new Date(r.started_at).getTime() > latestCompletedEnd,
    )
    if (retryOpen.length > 0) {
      return retryOpen.sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      )[0]
    }
    return completed.sort((a, b) => sessionEndMs(b) - sessionEndMs(a))[0]
  }

  return incomplete.sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )[0]
}

/** Representative session per `test_id` (see `representativeSessionForTest`). */
export function latestSessionByTestId(sessions: SessionRow[]): Map<string, SessionRow> {
  const byTest = new Map<string, SessionRow[]>()
  for (const row of sessions) {
    const arr = byTest.get(row.test_id) ?? []
    arr.push(row)
    byTest.set(row.test_id, arr)
  }
  const map = new Map<string, SessionRow>()
  for (const [testId, rows] of byTest) {
    const pick = representativeSessionForTest(rows)
    if (pick) map.set(testId, pick)
  }
  return map
}

function rowToUiStatus(row: SessionRow): 'upcoming' | 'in-progress' | 'completed' {
  if (row.status === 'completed') return 'completed'
  if (row.status === 'in-progress') return 'in-progress'
  return 'upcoming'
}

/**
 * Display % for a session: prefer `score`, else derive from correct/total
 * (Supabase `numeric` may arrive as string; some flows leave `score` null).
 */
export function resolveSessionScorePercent(row: SessionRow): number | null {
  if (row.status !== 'completed') return null
  const meta = row.metadata as Record<string, unknown> | null | undefined
  if (meta && meta.pendingAdminValidation === true && row.score == null) return null
  if (row.score != null) {
    const n = Number(row.score as number | string)
    if (Number.isFinite(n)) return Math.round(n)
  }
  const cc = row.correct_count
  const tq = row.total_questions
  if (cc != null && tq != null) {
    const nc = Number(cc)
    const nt = Number(tq)
    if (Number.isFinite(nc) && Number.isFinite(nt) && nt > 0) {
      return Math.round((nc / nt) * 100)
    }
  }
  return null
}

/**
 * Overlay real session state onto catalog tests (order preserved).
 */
export function mergeCatalogWithSessions(
  catalog: readonly Test[],
  sessions: SessionRow[],
): TestWithProgress[] {
  const sessionTestIds = [...new Set(sessions.map((s) => s.test_id))]
  const catalogIds = new Set(catalog.map((t) => t.id))
  const orphanTests: Test[] = []
  for (const id of sessionTestIds) {
    if (!catalogIds.has(id)) {
      orphanTests.push({
        id,
        title: id,
        domain: 'Other',
        status: 'upcoming',
        type: 'mcq',
        duration: 1800,
      })
    }
  }
  const fullCatalog = [...catalog, ...orphanTests]

  const byTest = latestSessionByTestId(sessions)
  return fullCatalog.map((t) => {
    const row = byTest.get(t.id)
    if (!row) {
      return {
        ...t,
        status: 'upcoming',
        latestScore: null,
        latestGeometryAnalytics: null,
      }
    }
    const status = rowToUiStatus(row)
    const latestScore = status === 'completed' ? resolveSessionScorePercent(row) : null
    const meta = row.metadata as Record<string, unknown> | null | undefined
    const latestGeometryAnalytics =
      meta && typeof meta.geometryAnalytics === 'object'
        ? parseGeometryAnalyticsReport(meta.geometryAnalytics)
        : null
    return {
      ...t,
      status,
      latestScore,
      latestSessionId: row.id,
      latestGeometryAnalytics,
    }
  })
}

/** Group catalog entries by `domain` string for results-style layout. */
export function groupTestsByDomain(tests: TestWithProgress[]): { domain: string; tests: TestWithProgress[] }[] {
  const order: string[] = []
  const buckets = new Map<string, TestWithProgress[]>()
  for (const t of tests) {
    const d = t.domain || 'Other'
    if (!buckets.has(d)) {
      buckets.set(d, [])
      order.push(d)
    }
    buckets.get(d)!.push(t)
  }
  return order.map((domain) => ({ domain, tests: buckets.get(domain)! }))
}

/** Mean of completed non-null scores in the list; 0 if none. */
export function averageCompletedScore(tests: TestWithProgress[]): number {
  const done = tests.filter((t) => t.status === 'completed' && t.latestScore != null)
  if (!done.length) return 0
  return Math.round(done.reduce((s, t) => s + (t.latestScore as number), 0) / done.length)
}

/** Chronological points for “progress over time” charts (oldest → newest). */
export function completedSessionsChronology(
  catalog: readonly Test[],
  sessions: SessionRow[],
): { test: string; score: number }[] {
  const titleByTestId = new Map(catalog.map((t) => [t.id, t.title]))
  const short = (s: string, max = 22) =>
    s.length <= max ? s : `${s.slice(0, max - 1)}…`

  return [...sessions]
    .filter((row) => row.status === 'completed' && row.score != null)
    .sort(
      (a, b) =>
        new Date(a.completed_at ?? a.started_at).getTime() -
        new Date(b.completed_at ?? b.started_at).getTime(),
    )
    .map((row) => ({
      test: short(titleByTestId.get(row.test_id) ?? row.test_id),
      score: Math.round(Number(row.score)),
    }))
}
