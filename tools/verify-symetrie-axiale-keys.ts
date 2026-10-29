import {
  SYMETRIE_AXIALE_QUESTIONS,
  isAxialeMulti,
  SYMETRIE_AXIALE_CORRECTION_REVIEW,
} from '../lib/geometry/symetrie-axiale.ts'
import { scoreGeometryQuestion } from '../lib/geometry/scoring.ts'

function q(id: string) {
  const x = SYMETRIE_AXIALE_QUESTIONS.find((t) => t.id === id)
  if (!x) throw new Error('missing ' + id)
  return x
}

function expectAns(id: string, want: number | number[]) {
  if (JSON.stringify(q(id).correctAnswer) !== JSON.stringify(want)) {
    throw new Error(`${id} got ${JSON.stringify(q(id).correctAnswer)} want ${JSON.stringify(want)}`)
  }
  console.log(id, 'OK')
}

if (q('Q1').correctAnswer !== null) throw new Error('Q1 autoeval')
expectAns('Q2', [0, 1, 2])
if (!isAxialeMulti(q('Q2'))) throw new Error('Q2 multi')
expectAns('Q3', [0, 1, 2])
if (!isAxialeMulti(q('Q3'))) throw new Error('Q3 multi')
expectAns('Q4', [0, 1, 2])
expectAns('Q5', 0)
expectAns('Q6', 0)
expectAns('Q7', 1)
if (!q('Q7').question.includes('(GH)')) throw new Error('Q7 GH')
if (q('Q7').options.some((o) => o.includes('(d)'))) throw new Error('Q7 still (d)')
expectAns('Q8', 0)
if (!q('Q8').question.includes('(GH)')) throw new Error('Q8 GH')
if (q('Q8').options.some((o) => o.includes('(d)'))) throw new Error('Q8 still (d)')
expectAns('Q9', 2)
expectAns('Q10', 1)
expectAns('Q11', [0, 2])
if (!isAxialeMulti(q('Q11'))) throw new Error('Q11 multi')
expectAns('Q12', 0)
expectAns('Q13', 2)
if (q('Q14').competencies.join() !== 'C2') throw new Error('Q14 C2')
expectAns('Q14', 0)
if (q('Q15').competencies.join() !== 'C2') throw new Error('Q15 C2')
expectAns('Q15', 3)
expectAns('Q16', 0)
expectAns('Q17', [0, 1])
if (!isAxialeMulti(q('Q17'))) throw new Error('Q17 multi')
expectAns('Q18', [0, 2])
if (!isAxialeMulti(q('Q18'))) throw new Error('Q18 multi')
if (!SYMETRIE_AXIALE_CORRECTION_REVIEW.find((r) => r.questionId === 'Q2')) {
  throw new Error('review Q2')
}

const q3 = q('Q3')
const full = scoreGeometryQuestion({
  options: q3.options,
  selected: [0, 1, 2],
  correctAnswer: q3.correctAnswer,
})
if (full !== 1) throw new Error('Q3 full ' + full)
const partial = scoreGeometryQuestion({
  options: q3.options,
  selected: [0, 1],
  correctAnswer: q3.correctAnswer,
})
if (partial !== 2 / 3) throw new Error('Q3 partial ' + partial)
const extra = scoreGeometryQuestion({
  options: q3.options,
  selected: [0, 1, 2, 3],
  correctAnswer: q3.correctAnswer,
})
if (extra !== 0) throw new Error('Q3 extra ' + extra)
const blank = scoreGeometryQuestion({
  options: q3.options,
  selected: [],
  correctAnswer: q3.correctAnswer,
})
if (blank !== 0) throw new Error('Q3 blank')
const q7 = q('Q7')
const q7ok = scoreGeometryQuestion({
  options: q7.options,
  selected: [1],
  correctAnswer: q7.correctAnswer,
})
if (q7ok !== 1) throw new Error('Q7 score')
const q7bad = scoreGeometryQuestion({
  options: q7.options,
  selected: [0],
  correctAnswer: q7.correctAnswer,
})
if (q7bad !== 0) throw new Error('Q7 wrong')
console.log('scoring OK')
console.log('all checks passed')
