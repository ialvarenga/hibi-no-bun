import { useState } from 'react'
import { Eye, Check, X, PartyPopper } from 'lucide-react'
import type { VocabCard } from '../lib/types'

interface VocabReviewProps {
  cards: VocabCard[]
  queuedCount: number
  onReview: (id: string, remembered: boolean) => void
  onClose: () => void
}

export default function VocabReview({ cards, queuedCount, onReview, onClose }: VocabReviewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const card = cards[index]

  function handleAnswer(remembered: boolean) {
    if (!card) return
    onReview(card.id, remembered)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  return (
    <section className="border border-paper-line bg-card rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo">
          Revisão de vocabulário
        </h2>
        <button
          onClick={onClose}
          className="text-xs underline underline-offset-2 text-ink-soft"
        >
          Fechar
        </button>
      </div>

      {!card ? (
        <div className="text-center py-8">
          <PartyPopper className="mx-auto mb-2 text-moss" size={28} />
          <p className="text-sm text-ink-soft">
            {queuedCount > 0
              ? `Lote concluído. Mais ${queuedCount} ${queuedCount === 1 ? 'palavra espera' : 'palavras esperam'} na fila — abra a revisão de novo para o próximo lote.`
              : 'Revisão concluída por hoje.'}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-4 text-ink-soft">
            {index + 1} de {cards.length}
          </p>

          <div className="text-center py-8 border border-paper-line rounded-xl mb-4 bg-paper">
            <span className="font-display text-3xl text-ink">
              {card.reading && card.reading !== card.word ? (
                <ruby>
                  {card.word}
                  <rt className="text-sm font-body font-normal text-ink-soft">
                    {card.reading}
                  </rt>
                </ruby>
              ) : (
                card.word
              )}
            </span>
            {revealed && <p className="text-sm mt-4 text-indigo-soft">{card.meaning_pt}</p>}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full border border-paper-line rounded-full px-4 py-2.5 text-sm inline-flex items-center justify-center gap-1.5 text-indigo-soft"
            >
              <Eye size={14} /> Revelar significado
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-vermillion/10 text-vermillion rounded-full px-4 py-2.5 text-sm inline-flex items-center justify-center gap-1.5"
              >
                <X size={14} /> Não lembrei
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-moss/10 text-moss rounded-full px-4 py-2.5 text-sm inline-flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> Lembrei
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
