import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { parseGeometryAnalyticsReport } from '@/lib/geometry/geometry-analytics-report'

/**
 * Mirrors `metadata.geometryAnalytics` into normalized tables (when migration
 * `supabase/migrations/0005_geometry_session_analytics.sql` has been applied).
 * Safe no-op on failure.
 */
export async function persistGeometryAnalyticsRows(
  sb: SupabaseClient<Database>,
  sessionId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const report = parseGeometryAnalyticsReport(metadata.geometryAnalytics)
  if (!report) return

  const partRows = report.parts.map((p) => ({
    session_id: sessionId,
    part_number: p.part,
    part_label: p.label,
    earned: p.earned,
    max_points: p.max,
    percent: p.percent,
    score_out_of_20: p.scoreOutOf20,
    correct_count: p.correctCount,
    total_scorable: p.totalScorable,
  }))

  const capRows = report.capacities.map((c) => ({
    session_id: sessionId,
    ck_code: c.code,
    ck_name: c.name,
    earned: c.earned,
    max_points: c.max,
    percent: c.percent,
    score_out_of_20: c.scoreOutOf20,
  }))

  if (partRows.length > 0) {
    const { error } = await sb.from('geometry_session_part_scores').insert(partRows)
    if (error) console.warn('[geometry_session_part_scores]', error.message)
  }
  if (capRows.length > 0) {
    const { error } = await sb.from('geometry_session_capacity_scores').insert(capRows)
    if (error) console.warn('[geometry_session_capacity_scores]', error.message)
  }
}
