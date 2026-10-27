import {
  DROITE_PLAN_QUESTIONS,
  DROITE_PLAN_CORRECTION_REVIEW,
  isDroitePlanMulti,
  isDroitePlanScorableQuestion,
} from '../lib/geometry/droite-plan.ts'
import { isExcludedFromGeometryScoreAndAverage } from '../lib/geometry/geometry-scoring-exclusions.ts'
import { getCanonicalPartIndex } from '../lib/geometry/geometry-partition.ts'

function scoreGeometryQuestion(input: {
  selected: number[]
  correctAnswer: number | number[] | null
}): number {
  const { selected, correctAnswer } = input
  if (correctAnswer === null || selected.length === 0) return 0
  if (Array.isArray(correctAnswer)) {
    const N = correctAnswer.length
    if (N === 0) return 0
    const correctSet = new Set(correctAnswer)
    if (selected.some((i) => !correctSet.has(i))) return 0
    return selected.filter((i) => correctSet.has(i)).length / N
  }
  return selected.length === 1 && selected[0] === correctAnswer ? 1 : 0
}

function q(n: number) {
  const x = DROITE_PLAN_QUESTIONS.find((t) => t.number === n)
  if (!x) throw new Error('missing Q' + n)
  return x
}

function check(n: number, want: number | number[]) {
  const item = q(n)
  if (JSON.stringify(item.correctAnswer) !== JSON.stringify(want)) {
    throw new Error(`Q${n} got ${JSON.stringify(item.correctAnswer)} want ${JSON.stringify(want)}`)
  }
  const selected = Array.isArray(want) ? want : [want]
  if (scoreGeometryQuestion({ selected, correctAnswer: item.correctAnswer }) !== 1) {
    throw new Error(`Q${n} full`)
  }
  console.log('Q' + n, 'OK')
}

if (q(1).isDiagnostic !== true) throw new Error('Q1 diagnostic')
if (isDroitePlanScorableQuestion(q(1))) throw new Error('Q1 not scorable')

if (!isDroitePlanMulti(q(2))) throw new Error('Q2 multi')
if (q(2).options.length !== 5) throw new Error('Q2 must have option E')
check(2, [0, 3, 4])
if (scoreGeometryQuestion({ selected: [0, 3], correctAnswer: q(2).correctAnswer }) !== 2 / 3) {
  throw new Error('Q2 partial')
}

const stem3 = q(3).question
if (!stem3.includes('C(0\\,;\\,1)')) throw new Error('Q3 C(0;1)')
if (!stem3.includes('2x - 3y + 2 = 0')) throw new Error('Q3 equation')
if ('constructionPlacement' in q(3) && q(3).constructionPlacement) {
  throw new Error('Q3 must not ask for placement')
}
check(3, 0)

check(4, 0)
check(5, 0)
check(6, 0)
check(7, 0)
check(8, 0)
check(9, 0)

if (!q(10).yesNo) throw new Error('Q10 yes/no')
if (q(10).options.join() !== 'Oui,Non') throw new Error('Q10 options')
check(10, 1)

check(11, 0)
if (!isDroitePlanScorableQuestion(q(11))) throw new Error('Q11 must score')
if (isExcludedFromGeometryScoreAndAverage(q(11))) throw new Error('Q11 not excluded')

check(12, 0)
check(13, 0)

const scorable = DROITE_PLAN_QUESTIONS.filter(isDroitePlanScorableQuestion)
if (scorable.length !== 12) throw new Error('scorable ' + scorable.length)
if (getCanonicalPartIndex('test-geo-line-plane', q(2)) !== 1) throw new Error('part Q2')
if (getCanonicalPartIndex('test-geo-line-plane', q(8)) !== 2) throw new Error('part Q8')
if (getCanonicalPartIndex('test-geo-line-plane', q(12)) !== 3) throw new Error('part Q12')
if (!scorable.every((item) => item.competencies.length > 0)) throw new Error('Ck')
if (!DROITE_PLAN_CORRECTION_REVIEW.find((r) => r.questionId === 'T3-D2-Q11')) {
  throw new Error('review Q11')
}
console.log('all checks passed')
