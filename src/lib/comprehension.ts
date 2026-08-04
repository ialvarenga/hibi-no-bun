import type { ComprehensionQuestion } from './types'

export interface ComprehensionScore {
  answered: number
  correct: number
  total: number
}

export function scoreComprehension(
  questions: ComprehensionQuestion[],
  answers: Record<number, number>,
): ComprehensionScore {
  const total = questions.length
  const answered = Object.keys(answers).length
  const correct = questions.reduce((n, q, qi) => (answers[qi] === q.answer_index ? n + 1 : n), 0)
  return { answered, correct, total }
}
