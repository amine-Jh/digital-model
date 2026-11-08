/**
 * Shared scoring rules for the "Cognition et apprentissage de la géométrie"
 * domain. Per spec:
 *
 *   • Single-correct question
 *       – correct selected            → +1
 *       – any incorrect / forgotten   →  0
 *
 *   • Multi-correct question (let N = number of correct options)
 *       – all correct + no incorrect  → +1
 *       – partial: k correct, 0 wrong → +k/N
 *       – any incorrect selected      →  0
 *       – "Je ne sais pas / oublié"   →  0
 *
 *   • Open-ended / diagnostic / interactive items are not scored.
 *
 * The helper returns a number in [0, 1] so the per-question contribution
 * always sits on the same scale. Use computeFinalPercent() to get the
 * normalised final score.
 */

import { isExclusiveOption } from '@/lib/quiz-helpers'

export interface ScoreInput {
  /** The list of option strings shown to the student. */
  options: string[]
  /** Indices currently selected by the student (after toggle rules). */
  selected: number[]
  /**
   * The canonical correct answer:
   *   - number       → single-correct
   *   - number[]     → multi-correct
   *   - null         → not scored (returns 0)
   */
  correctAnswer: number | number[] | null
}

/**
 * Multi-correct score from the 2027 research brief:
 *   S = max(0, Cs/C − Is/I) when incorrect options exist,
 *   S = Cs/C when every non-exclusive option is correct.
 * Exclusive “je ne sais pas / oublié” selections score 0.
 * Returns a value in [0, 1]. Single-correct items are not handled here.
 */
export function scorePenalizedMulti(input: ScoreInput): number {
  const { options, selected, correctAnswer } = input
  if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) return 0
  if (selected.length === 0) return 0
  if (selected.some((i) => isExclusiveOption(options[i] ?? ''))) return 0

  const correctSet = new Set(correctAnswer)
  const C = correctAnswer.length
  const incorrectPool = options
    .map((_, i) => i)
    .filter((i) => !correctSet.has(i) && !isExclusiveOption(options[i] ?? ''))
  const I = incorrectPool.length
  const Cs = selected.filter((i) => correctSet.has(i)).length
  const Is = selected.filter((i) => incorrectPool.includes(i)).length
  const ratio = I === 0 ? Cs / C : Cs / C - Is / I
  return Math.max(0, Math.min(1, ratio))
}

/**
 * Default MCQ score. Multi-correct items use the penalized formula.
 * Single-correct items stay all-or-nothing. Tests that already document
 * another rule (axial symmetry, central symmetry, vectors placement/fill-in)
 * must keep calling their own function.
 */
export function scoreStandardMcq(input: ScoreInput): number {
  if (Array.isArray(input.correctAnswer)) return scorePenalizedMulti(input)
  return scoreGeometryQuestion(input)
}

/** Returns the per-question score in the closed interval [0, 1]. */
export function scoreGeometryQuestion(input: ScoreInput): number {
  const { options, selected, correctAnswer } = input
  if (correctAnswer === null) return 0
  if (selected.length === 0) return 0

  // Any "I forgot / I don't know" option selected → 0
  if (selected.some((i) => isExclusiveOption(options[i] ?? ''))) return 0

  if (Array.isArray(correctAnswer)) {
    const N = correctAnswer.length
    if (N === 0) return 0
    const correctSet = new Set(correctAnswer)

    // Any incorrect selection cancels the question
    const hasIncorrect = selected.some((i) => !correctSet.has(i))
    if (hasIncorrect) return 0

    // Partial credit = k / N
    const k = selected.filter((i) => correctSet.has(i)).length
    return k / N
  }

  // Single-correct
  if (selected.length === 1 && selected[0] === correctAnswer) return 1
  return 0
}

/**
 * Convenience helper: a question scores 1 if the per-question score equals 1.
 * Use this for tests that store `correct: boolean` instead of a fractional
 * score — partial credit collapses to "incorrect" in that boolean view.
 */
export function isFullyCorrect(input: ScoreInput): boolean {
  return scoreGeometryQuestion(input) === 1
}

/** Sum the question scores into a 0–100 percentage. */
export function computeFinalPercent(perQuestionScores: number[]): number {
  if (perQuestionScores.length === 0) return 0
  const total = perQuestionScores.reduce((s, v) => s + v, 0)
  return Math.round((total / perQuestionScores.length) * 100)
}
