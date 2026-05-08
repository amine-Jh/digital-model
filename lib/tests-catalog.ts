/**
 * Test catalogue from Supabase `public.tests` (RLS: any authenticated user can read).
 * Maps rows to the shared `Test` shape used by dashboards and merge helpers.
 * In-repo `mockTests` still supplies embedded `questions` for the generic runner
 * where the DB row has no question bank yet.
 */

import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Test } from '@/lib/mock-data'
import { mockTests } from '@/lib/mock-data'
import type { Database } from '@/lib/types/database'

type TestsRow = Database['public']['Tables']['tests']['Row']

/** DB `domain` slug → display string used by `groupTestsByDomain` / `getDomainPresentation`. */
const DB_DOMAIN_TO_DISPLAY: Record<string, string> = {
  'cognitive-capacity': 'Cognitive Capacity',
  'cognition-geometrie': 'Cognition et apprentissage de la géométrie',
  reasoning: 'Cognitive Capacity',
  attentional: 'Cognitive Capacity',
}

function readMetadata(row: TestsRow): Record<string, unknown> {
  const m = row.metadata
  if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>
  return {}
}

/**
 * Overlay Supabase rows onto the in-repo catalogue so every seeded/mock test id
 * stays available (questions, durations) while titles/domains come from the DB.
 * Appends DB-only rows that are not present in `mockTests`.
 */
export function mergeDbCatalogOntoMock(dbTests: Test[]): Test[] {
  const dbById = new Map(dbTests.map((t) => [t.id, t]))
  const merged = mockTests.map((mock) => {
    const db = dbById.get(mock.id)
    if (!db) return mock
    return {
      ...mock,
      title: db.title,
      domain: db.domain,
      type: db.type,
      duration: db.duration,
    }
  })
  const mockIds = new Set(mockTests.map((t) => t.id))
  /** Legacy catalogue ids that duplicate canonical `mockTests` rows — avoid double listings in UI. */
  const legacyDuplicateIds = new Set([
    'test-symetrie-axiale',
    'test-symetrie-centrale',
    'test-droite-plan',
    'test-trig-unit-circle',
  ])
  const extras = dbTests.filter((t) => !mockIds.has(t.id) && !legacyDuplicateIds.has(t.id))
  return [...merged, ...extras]
}

export function testsRowToCatalogTest(row: TestsRow): Test {
  const meta = readMetadata(row)
  const typeRaw = meta.type
  const type: Test['type'] =
    typeRaw === 'drawing' || typeRaw === 'text' || typeRaw === 'audio' || typeRaw === 'mcq'
      ? typeRaw
      : 'mcq'
  const duration =
    typeof meta.durationSeconds === 'number' && Number.isFinite(meta.durationSeconds)
      ? Math.max(60, meta.durationSeconds)
      : 1800

  const displayDomain =
    typeof meta.displayDomain === 'string' && meta.displayDomain.trim() !== ''
      ? meta.displayDomain.trim()
      : DB_DOMAIN_TO_DISPLAY[row.domain] ??
        row.domain
          .split('-')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')

  return {
    id: row.id,
    title: row.name,
    domain: displayDomain,
    status: 'upcoming',
    type,
    duration,
  }
}

export async function listTestsCatalog(): Promise<{ data: Test[]; error: string | null }> {
  const sb = getSupabaseBrowser()
  // Ensure the JWT is attached to the client before hitting RLS-protected `tests`.
  await sb.auth.getSession()
  await sb.auth.getUser()
  const { data, error } = await sb
    .from('tests')
    .select('*')
    .eq('is_active', true)
    .order('domain', { ascending: true })
    .order('name', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []).map((r) => testsRowToCatalogTest(r)), error: null }
}

/**
 * Resolve the `Test` object for the generic runner: titles/domains from the DB
 * catalogue when present, `questions` / timings from `mockTests` when defined there.
 */
export function getTestForRunner(testId: string, catalog: readonly Test[]): Test | undefined {
  const fromDb = catalog.find((t) => t.id === testId)
  const fromMock = mockTests.find((t) => t.id === testId)
  if (!fromDb && !fromMock) return undefined

  const questions = fromMock?.questions?.length ? fromMock.questions : undefined
  const title = fromDb?.title ?? fromMock?.title ?? testId
  const domain = fromDb?.domain ?? fromMock?.domain ?? ''
  const hasLocalBank = Boolean(fromMock?.questions?.length)

  return {
    id: testId,
    title,
    domain,
    status: 'upcoming',
    type: hasLocalBank ? fromMock!.type : (fromDb?.type ?? fromMock?.type ?? 'mcq'),
    duration: hasLocalBank ? fromMock!.duration : (fromDb?.duration ?? fromMock?.duration ?? 1800),
    ...(questions ? { questions } : {}),
  }
}
