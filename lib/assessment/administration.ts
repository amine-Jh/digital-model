import { geometryCognitionTestIds, platformDomains } from '@/lib/platform-domains'

/** Geometry lessons are taken inside the application. */
export const GEOMETRY_MODULE_ID = 'geometry-learning'

/**
 * These five tests belong to other domains, but they are taken inside the
 * application. Every other non-geometry catalogue test is external.
 */
export const INTERNAL_EXCEPTION_TEST_IDS = [
  'test-spatial-orientation',
  'test-spatial-transformation',
  'test-visuo-perceptive',
  'test-long-term-memory',
  'test-deductive-reasoning',
] as const

const INTERNAL_EXCEPTIONS = new Set<string>(INTERNAL_EXCEPTION_TEST_IDS)

export function externalTestIds(): string[] {
  const internal = new Set(geometryCognitionTestIds())
  const ids = platformDomains.flatMap((d) =>
    d.subdomains.flatMap((s) => s.capacities.map((c) => c.testId)),
  )
  return [...new Set(ids.filter((id) => !internal.has(id) && !INTERNAL_EXCEPTIONS.has(id)))]
}

export function isGeometryModuleTest(testId: string): boolean {
  return geometryCognitionTestIds().includes(testId)
}

export function isInternalExceptionTest(testId: string): boolean {
  return INTERNAL_EXCEPTIONS.has(testId)
}

export function isExternalTest(testId: string): boolean {
  return externalTestIds().includes(testId)
}

export const EXTERNAL_STUDENT_NOTICE =
  'Ce test se passe sur une plateforme externe. Il ne peut pas être commencé dans cette application. Les résultats seront importés ensuite par un administrateur.'
