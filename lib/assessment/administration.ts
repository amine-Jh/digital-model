import { geometryCognitionTestIds, platformDomains } from '@/lib/platform-domains'

/** Geometry lessons are taken inside the application. */
export const GEOMETRY_MODULE_ID = 'geometry-learning'

/**
 * Cognitive tests listed outside the geometry module are administered on an
 * external platform. They stay in the catalogue, but students cannot start
 * them here. Geometry tests are never included.
 */
export function externalTestIds(): string[] {
  const internal = new Set(geometryCognitionTestIds())
  const ids = platformDomains.flatMap((d) =>
    d.subdomains.flatMap((s) => s.capacities.map((c) => c.testId)),
  )
  return [...new Set(ids.filter((id) => !internal.has(id)))]
}

export function isGeometryModuleTest(testId: string): boolean {
  return geometryCognitionTestIds().includes(testId)
}

export function isExternalTest(testId: string): boolean {
  return externalTestIds().includes(testId)
}

export const EXTERNAL_STUDENT_NOTICE =
  'Ce test se passe sur une plateforme externe. Il ne peut pas être commencé dans cette application. Les résultats seront importés ensuite par un administrateur.'
