import {
  SYMETRIE_CENTRALE_QUESTIONS,
  SYMETRIE_CENTRALE_CORRECTION_REVIEW,
  isSymCentraleMulti,
  isSymCentraleScorableQuestion,
} from '../lib/geometry/symetrie-centrale.ts'

function q(id: string) {
  const x = SYMETRIE_CENTRALE_QUESTIONS.find((t) => t.id === id)
  if (!x) throw new Error('missing ' + id)
  return x
}

function expectAns(id: string, want: number | number[]) {
  const a = q(id).correctAnswer
  if (JSON.stringify(a) !== JSON.stringify(want)) {
    throw new Error(`${id} got ${JSON.stringify(a)} want ${JSON.stringify(want)}`)
  }
  console.log(id, 'OK')
}

expectAns('Q1', 1)
if (q('Q1').competency !== 'C1') throw new Error('Q1 C1')
if (!isSymCentraleScorableQuestion(q('Q1'))) throw new Error('Q1 must score')
expectAns('Q2', 0)
if (!isSymCentraleScorableQuestion(q('Q2'))) throw new Error('Q2 must score')

expectAns('Q3', [0, 1, 2])
if (!isSymCentraleMulti(q('Q3'))) throw new Error('Q3 multi')
expectAns('Q4', [0, 1, 2])
expectAns('Q5', 0)
expectAns('Q6', 0)
expectAns('Q7', 1)
if (q('Q7').figure !== 'shared-i') throw new Error('Q7 figure')
expectAns('Q8', 2)
expectAns('Q9', [0, 2])
if (!isSymCentraleMulti(q('Q9'))) throw new Error('Q9 multi')
expectAns('Q10', 0)
expectAns('Q11', 1)
expectAns('Q12', 0)
expectAns('Q13', 1)
for (const id of ['Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13']) {
  if (q(id).figure !== 'shared-i') throw new Error(id + ' shared figure')
  if (q(id).competency !== 'C1') throw new Error(id + ' C1')
}
expectAns('Q14', [0, 1])
expectAns('Q15', [0, 1, 2])
expectAns('Q16', [0, 1])
if (!isSymCentraleMulti(q('Q16'))) throw new Error('Q16 multi')
if (q('Q16').optionImages?.length !== 2) throw new Error('Q16 two figures')
expectAns('Q17', 2)
if (q('Q17').competency !== 'C2') throw new Error('Q17 C2')

const scored = SYMETRIE_CENTRALE_QUESTIONS.filter(isSymCentraleScorableQuestion)
if (scored.filter((x) => x.competency === 'C1').length !== 13) throw new Error('C1 scored count')
if (scored.filter((x) => x.competency === 'C2').length !== 4) throw new Error('C2 scored count')
if (!SYMETRIE_CENTRALE_CORRECTION_REVIEW.find((r) => r.questionId === 'Q7')) {
  throw new Error('review Q7')
}
console.log('all checks passed')
