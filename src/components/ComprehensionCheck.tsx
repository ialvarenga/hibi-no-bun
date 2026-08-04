import { Check, X, HelpCircle } from 'lucide-react'
import { scoreComprehension } from '../lib/comprehension'
import type { ComprehensionQuestion } from '../lib/types'

interface ComprehensionCheckProps {
  questions: ComprehensionQuestion[]
  // Persisted on the reading entry itself (see db.saveComprehensionAnswer),
  // not local component state — regenerating today's paragraph swaps in a
  // fresh entry with no answers yet, so this naturally resets too.
  answers: Record<number, number>
  onAnswer: (questionIndex: number, choiceIndex: number) => void
}

export default function ComprehensionCheck({ questions, answers, onAnswer }: ComprehensionCheckProps) {
  if (questions.length === 0) return null

  const score = scoreComprehension(questions, answers)
  const allAnswered = score.answered === score.total

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo flex items-center gap-1.5">
        <HelpCircle size={13} className="shrink-0" /> Verifique sua compreensão
        {allAnswered && (
          <span
            className={`ml-auto normal-case tracking-normal font-medium ${
              score.correct === score.total ? 'text-moss' : 'text-vermillion'
            }`}
          >
            {score.correct}/{score.total} corretas
          </span>
        )}
      </h3>
      <div className="grid gap-3">
        {questions.map((q, qi) => {
          const selected = answers[qi]
          const answered = selected !== undefined

          return (
            <div key={qi} className="border border-paper-line rounded-xl p-3 bg-paper">
              <p className="text-sm mb-2 text-ink">{q.question}</p>
              <div className="grid gap-1.5">
                {q.choices.map((choice, ci) => {
                  const isCorrect = ci === q.answer_index
                  const isSelected = ci === selected

                  let stateClasses = 'border-paper-line text-ink'
                  if (answered && isCorrect) {
                    stateClasses = 'border-moss bg-moss/10 text-moss'
                  } else if (answered && isSelected && !isCorrect) {
                    stateClasses = 'border-vermillion bg-vermillion/10 text-vermillion'
                  }

                  return (
                    <button
                      key={ci}
                      onClick={() => !answered && onAnswer(qi, ci)}
                      disabled={answered}
                      className={`text-left border rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 disabled:opacity-100 ${stateClasses}`}
                    >
                      <span>{choice}</span>
                      {answered && isCorrect && <Check size={13} className="shrink-0" />}
                      {answered && isSelected && !isCorrect && (
                        <X size={13} className="shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
