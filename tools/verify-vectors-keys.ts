import {
  VECTORS_QUESTIONS,
  hasGradedFillIn,
  isVectorsAutoEvalQuestion,
  isVectorsScorableQuestion,
  scoreVectorsFillIn,
  scoreVectorsPlacements,
} from '../lib/geometry/geo-vectors-complete.ts'
import {
  checkVectorsSequentialPlacement,
  VECTORS_SEQUENTIAL_PLACEMENT_KEYS,
} from '../lib/geometry/vectors-placement-keys.ts'

function scoreGeometryQuestion(input: {
  options: string[]
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
  const x = VECTORS_QUESTIONS.find((t) => t.id === id)
  if (!x) throw new Error('missing ' + id)
  return x
}

function checkMcq(id: string, want: number | number[]) {
  const item = q(id)
  const a = item.correctAnswer
  if (JSON.stringify(a) !== JSON.stringify(want)) {
    throw new Error(`${id} got ${JSON.stringify(a)} want ${JSON.stringify(want)}`)
  }
  if (Array.isArray(want) && want.length > 1) {
    const full = scoreGeometryQuestion({
      options: item.options,
      selected: want,
      correctAnswer: a,
    })
    const partial = scoreGeometryQuestion({
      options: item.options,
      selected: [want[0]],
      correctAnswer: a,
    })
    if (full !== 1) throw new Error(`${id} full score ${full}`)
    if (partial !== 1 / want.length) throw new Error(`${id} partial ${partial}`)
    if (!want.includes(0)) {
      const extraWrong = scoreGeometryQuestion({
        options: item.options,
        selected: [...want, 0],
        correctAnswer: a,
      })
      if (extraWrong !== 0) throw new Error(`${id} extra wrong ${extraWrong}`)
    }
  }
  console.log(id, 'OK')
}

checkMcq('Q1', 2)
checkMcq('Q2', 3)
if (Array.isArray(q('Q2').correctAnswer) || q('Q2').correctAnswer !== 3) {
  throw new Error('Q2 must be D only')
}
if (q('Q2').options.length !== 4) throw new Error('Q2 must not have option E')
checkMcq('Q3', [1, 2])
checkMcq('Q4', [0, 1, 2])
checkMcq('Q5', [1, 2])
checkMcq('Q6', [0, 2])
checkMcq('Q7', 0)
checkMcq('Q8', [1, 3, 4])
checkMcq('Q12', 1)
checkMcq('Q13', 0)
checkMcq('Q14', 0)
checkMcq('Q15', [1, 2])
checkMcq('Q16', 1)
checkMcq('Q17', 0)
checkMcq('Q19', [0, 1])
checkMcq('Q20', [0, 1, 2])
checkMcq('Q21', [1, 2])

for (const id of ['Q9', 'Q10', 'Q11', 'Q18']) {
  const item = q(id)
  if (isVectorsAutoEvalQuestion(item)) throw new Error(id + ' must not be autoeval')
  if (!isVectorsScorableQuestion(item)) throw new Error(id + ' must be scorable')
  if (item.competencies.join() !== 'C1') throw new Error(id + ' C1')
}
if (!q('Q10').sequentialPlacement || !q('Q11').sequentialPlacement) {
  throw new Error('Q10/Q11 sequential')
}

const i9 = q('Q9').placementExpected?.[0]
if (!i9 || i9.x !== 2 || i9.y !== 1) throw new Error('Q9')
if (scoreVectorsPlacements('I(2;1)', q('Q9').placementExpected!) !== 1) throw new Error('Q9 score')
console.log('Q9 I(2;1) scored OK')

if (q('Q10').placementExpected) throw new Error('Q10 keys must not ship to the client')
if (q('Q10').pointPlacement?.labels.join() !== 'Q,M') throw new Error('Q10 order')
if (q('Q11').placementExpected) throw new Error('Q11 keys must not ship to the client')
if (q('Q11').pointPlacement?.labels.join() !== 'P,N') throw new Error('Q11 order')

const q10ok = checkVectorsSequentialPlacement({ questionId: 'Q10', name: 'Q', x: 7, y: -3 })
if (!q10ok?.correct || q10ok.nextName !== 'M') throw new Error('Q10 Q')
const q10m = checkVectorsSequentialPlacement({ questionId: 'Q10', name: 'M', x: 7, y: 0 })
if (!q10m?.correct || q10m.nextName !== null) throw new Error('Q10 M')
const q10bad = checkVectorsSequentialPlacement({ questionId: 'Q10', name: 'Q', x: 0, y: 0 })
if (q10bad?.correct !== false) throw new Error('Q10 wrong')
if (
  VECTORS_SEQUENTIAL_PLACEMENT_KEYS.Q10[0].x !== 7 ||
  VECTORS_SEQUENTIAL_PLACEMENT_KEYS.Q10[0].y !== -3
) {
  throw new Error('Q10 key')
}
console.log('Q10 sequential Q then M scored OK')

const p11 = checkVectorsSequentialPlacement({ questionId: 'Q11', name: 'P', x: 6, y: -1 })
if (!p11?.correct || p11.nextName !== 'N') throw new Error('Q11 P')
const n11 = checkVectorsSequentialPlacement({ questionId: 'Q11', name: 'N', x: 3, y: -3 })
if (!n11?.correct || n11.nextName !== null) throw new Error('Q11 N')
const n11old = checkVectorsSequentialPlacement({ questionId: 'Q11', name: 'N', x: 2, y: -3 })
if (n11old?.correct !== false) throw new Error('Q11 N manuscript 2,-3 must be wrong')
console.log('Q11 sequential P then N(3;-3) scored OK')

if (!hasGradedFillIn(q('Q18'))) throw new Error('Q18 should be graded')
const f18 = q('Q18').fillIn!.fields
if (f18[0].expected !== '-1/3' || f18[1].expected !== '3/4' || f18[2].expected !== '5') {
  throw new Error('Q18 fields')
}
if (scoreVectorsFillIn('-1/3 ; 3/4 ; 5', f18) !== 1) throw new Error('Q18 full')
if (scoreVectorsFillIn('-1/3 ; 3/4 ; ', f18) !== 2 / 3) throw new Error('Q18 partial')
console.log('Q18 three coefficients scored OK')

const auto = VECTORS_QUESTIONS.filter(isVectorsAutoEvalQuestion).map((x) => x.id)
if (auto.join() !== 'AutoEval-1,AutoEval-3') throw new Error('autoeval ids ' + auto.join())
const scorable = VECTORS_QUESTIONS.filter(isVectorsScorableQuestion)
if (scorable.length !== 21) throw new Error('scorable count ' + scorable.length)
if (!scorable.every((x) => x.competencies.length > 0)) throw new Error('Ck missing')
console.log('all checks passed')
