/**
 * `test_sessions` FK requires `user_id → profiles.id` and `test_id → tests.id`.
 * PostgREST often surfaces FK / unique violations as HTTP 409.
 *
 * When `SUPABASE_SERVICE_ROLE_KEY` is set, we heal missing rows (dev / small teams).
 * Otherwise we return a clear 400-style message so the API can respond readably.
 */

import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mockTests } from '@/lib/mock-data'
import type { Database, UserRole } from '@/lib/types/database'
import { tryGetSupabaseAdmin } from '@/lib/supabase/server'

function testsDomainSlug(displayDomain: string): string {
  const d = displayDomain.toLowerCase()
  if (d.includes('géom') || d.includes('geomet')) return 'cognition-geometrie'
  return 'cognitive-capacity'
}

export type EnsureFkResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

export async function ensureTestSessionFkPrereqs(
  sb: SupabaseClient<Database>,
  user: User,
  testId: string,
): Promise<EnsureFkResult> {
  const admin = tryGetSupabaseAdmin()

  if (admin) {
    try {

      const { data: prof } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!prof) {
        const meta = user.user_metadata as { full_name?: string; role?: string } | undefined
        const email =
          (typeof user.email === 'string' && user.email.trim() !== ''
            ? user.email.trim()
            : `user-${user.id.slice(0, 8)}@pending.local`) || `user-${user.id.slice(0, 8)}@pending.local`
        const r = meta?.role
        const role: UserRole =
          r === 'admin' || r === 'super_admin' || r === 'teacher' || r === 'student' ? r : 'student'
        const { error: pErr } = await admin.from('profiles').insert({
          id: user.id,
          email,
          full_name: typeof meta?.full_name === 'string' ? meta.full_name.trim() || null : null,
          role,
          school_id: null,
        })
        if (pErr && pErr.code !== '23505') {
          return { ok: false, status: 500, message: `profiles: ${pErr.message}` }
        }
      }

      const { data: testRow } = await admin.from('tests').select('id').eq('id', testId).maybeSingle()
      if (!testRow) {
        const mock = mockTests.find((t) => t.id === testId)
        const { error: tErr } = await admin.from('tests').upsert(
          {
            id: testId,
            name: mock?.title ?? testId,
            domain: mock ? testsDomainSlug(mock.domain) : 'cognitive-capacity',
            description: mock ? 'Synced from app mockTests' : 'Auto-created for FK',
            metadata: {},
            is_active: true,
          },
          { onConflict: 'id' },
        )
        if (tErr) {
          return { ok: false, status: 500, message: `tests catalogue: ${tErr.message}` }
        }
      }

      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('SERVICE_ROLE')) {
        return { ok: false, status: 500, message: msg }
      }
    }
  }

  const { data: testOk } = await sb.from('tests').select('id').eq('id', testId).maybeSingle()
  if (!testOk) {
    return {
      ok: false,
      status: 400,
      message: `Unknown test_id "${testId}" in public.tests. Run supabase/seed.sql (or set SUPABASE_SERVICE_ROLE_KEY so the app can upsert catalogue rows).`,
    }
  }

  const { data: profileOk } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!profileOk) {
    return {
      ok: false,
      status: 400,
      message:
        'No public.profiles row for this user. Sign-up should create it via trigger; set SUPABASE_SERVICE_ROLE_KEY for auto-provision in dev.',
    }
  }

  return { ok: true }
}

/** Force contiguous indices so a remote UNIQUE(session_id, question_index) cannot 409. */
export function normalizeTrialQuestionIndices<
  T extends { question_index: number; session_id?: string },
>(rows: T[]): T[] {
  return rows.map((row, idx) => ({ ...row, question_index: idx }))
}
