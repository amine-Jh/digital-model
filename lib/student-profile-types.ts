/** Moroccan secondary education — profile stored per student user. */

import type { ScholarLevel } from '@/lib/mock-data'

/**
 * Scholar levels supported in the platform — kept aligned with the canonical
 * SCHOLAR_LEVELS list in lib/mock-data.ts so the registration form, profile
 * page and teacher dashboards all share the same vocabulary.
 */
export type MoroccanGradeLevel = ScholarLevel

export type AcademicTrack =
  | 'Scientific'
  | 'Mathematical Sciences'
  | 'Experimental Sciences'
  | ''

export interface StudentAcademicProfile {
  userId: string
  fullName: string
  age: number
  gender: 'Male' | 'Female' | ''
  /** Set when the student chose a registered teacher (`student_profiles.teacher_id`). */
  teacherId: string | null
  /** Display label (denormalized from the teacher profile or legacy free text). */
  teacherName: string
  schoolName: string
  gradeLevel: MoroccanGradeLevel
  /** Derived from the grade level — kept for downstream analytics. */
  academicTrack: AcademicTrack
  academicYear: string
  className?: string | null
  /** Average for academic year 2025 / 2026 (current). */
  mathAverage2025_2026: number | null
  /** Average for academic year 2024 / 2025 (previous). */
  mathAverage2024_2025: number | null
  updatedAt: string
}

/**
 * Map a niveau scolaire to its implicit academic track. The new four-level
 * enum already embeds the track in the level name, so we no longer need a
 * separate UI selector for it — this helper centralises the mapping.
 */
export function resolveDefaultTrack(grade: MoroccanGradeLevel): AcademicTrack {
  switch (grade) {
    case 'Tronc commun scientifique':
      return 'Scientific'
    case '1ère année Baccalauréat – Sciences expérimentales':
      return 'Experimental Sciences'
    case '1ère année Baccalauréat – Sciences mathématiques':
      return 'Mathematical Sciences'
    case '3ème année collège':
    default:
      return ''
  }
}

/**
 * No grade level requires manual track selection any more — the four
 * supported levels map deterministically to a track via resolveDefaultTrack().
 * Kept for backwards compatibility with callers.
 */
export function trackRequired(_grade: MoroccanGradeLevel): boolean {
  return false
}
