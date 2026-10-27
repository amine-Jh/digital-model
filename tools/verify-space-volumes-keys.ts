import {
  SPACE_VOLUMES_QUESTIONS,
  SPACE_VOLUMES_LIVE_QUESTIONS,
  isSpaceVolumesLive,
} from '../lib/geometry/space-volumes.ts'
import { getCanonicalPartIndex } from '../lib/geometry/geometry-partition.ts'
import { getCapacitiesForTestId } from '../lib/geometry/capacity-definitions.ts'

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

function q(id: string) {
  const x = SPACE_VOLUMES_QUESTIONS.find((t) => t.id === id)
  if (!x) throw new Error('missing ' + id)
  return x
}

function expectAns(id: string, want: number) {
  if (q(id).correctAnswer !== want) {
    throw new Error(`${id} got ${JSON.stringify(q(id).correctAnswer)} want ${want}`)
  }
  if (q(id).options.length !== 3) throw new Error(id + ' not 3 options')
  console.log(id, 'OK')
}

if (SPACE_VOLUMES_QUESTIONS.length !== 15) throw new Error('need 15 items')
if (SPACE_VOLUMES_LIVE_QUESTIONS.length !== 10) {
  throw new Error('only Q1–Q10 should be live, got ' + SPACE_VOLUMES_LIVE_QUESTIONS.length)
}

expectAns('Q1', 0)
expectAns('Q2', 1)
expectAns('Q3', 2)
expectAns('Q4', 1)
expectAns('Q5', 2)
expectAns('Q6', 1)
expectAns('Q7', 0)
expectAns('Q8', 1)
expectAns('Q9', 2)
expectAns('Q10', 1)

for (const id of ['Q11', 'Q12', 'Q13', 'Q14', 'Q15']) {
  const item = q(id)
  if (isSpaceVolumesLive(item)) throw new Error(id + ' must not be published')
  if (item.correctAnswer !== null) throw new Error(id + ' no invented key')
  if (item.imagePath !== `/images/geometry/space-volumes/${id.toLowerCase()}.jpg`) {
    throw new Error(id + ' photo slot')
  }
  if (item.options.length !== 0) throw new Error(id + ' student options must stay empty')
  console.log(id, 'unpublished slot OK')
}

if (getCanonicalPartIndex('test-geo-space-volumes', q('Q1')) !== 1) throw new Error('part I')
if (getCanonicalPartIndex('test-geo-space-volumes', q('Q6')) !== 2) throw new Error('part II')
if (getCanonicalPartIndex('test-geo-space-volumes', q('Q11')) !== 3) throw new Error('part III')

if (getCapacitiesForTestId('test-geo-space-volumes').length !== 0) {
  throw new Error('do not invent Ck labels')
}

const q6 = q('Q6')
if (
  scoreGeometryQuestion({
    selected: [1],
    correctAnswer: q6.correctAnswer,
  }) !== 1
) {
  throw new Error('Q6 score')
}
if (
  scoreGeometryQuestion({
    selected: [0],
    correctAnswer: q6.correctAnswer,
  }) !== 0
) {
  throw new Error('Q6 wrong')
}
if (
  scoreGeometryQuestion({
    selected: [],
    correctAnswer: q6.correctAnswer,
  }) !== 0
) {
  throw new Error('Q6 blank')
}

console.log('all checks passed')
