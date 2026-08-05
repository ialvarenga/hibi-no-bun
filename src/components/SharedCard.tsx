import { Users, Loader2, ExternalLink } from 'lucide-react'
import FuriganaText from './FuriganaText'
import GrammarChipRow from './GrammarChipRow'
import ComprehensionCheck from './ComprehensionCheck'
import SpeakButton from './SpeakButton'
import ReportText from './ReportText'
import type { SharedEntry } from '../lib/types'

interface SharedCardProps {
  entries: SharedEntry[]
  retrieving: boolean
  error: string | null
  onRetrieve: () => void
  showFurigana: boolean
  jlptLevels: string[]
  onAnswerComprehension: (id: string, questionIndex: number, choiceIndex: number) => void
}

export default function SharedCard({
  entries,
  retrieving,
  error,
  onRetrieve,
  showFurigana,
  jlptLevels,
  onAnswerComprehension,
}: SharedCardProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">Comunidade</h2>

      <button
        onClick={onRetrieve}
        disabled={retrieving}
        className="bg-indigo text-white rounded-full px-6 py-3 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60 mb-4"
      >
        {retrieving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Buscando...
          </>
        ) : (
          <>
            <Users size={16} /> Pergunta da comunidade
          </>
        )}
      </button>
      {error && <p className="text-xs mb-4 text-vermillion">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhuma pergunta da comunidade ainda — clique no botão acima para buscar uma.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((h, i) => (
            <details
              key={h.id}
              open={i === 0}
              className="border border-paper-line bg-card rounded-xl px-4 py-3"
            >
              <summary className="cursor-pointer text-sm text-ink">
                {h.date} · {h.theme}
              </summary>
              <FuriganaText
                text={h.paragraph_jp}
                showReadings={showFurigana}
                jlptLevels={jlptLevels}
                vocab={h.vocab}
                className="block font-display text-base mt-3 leading-loose text-ink"
              />
              <div className="mt-2">
                <SpeakButton text={h.paragraph_jp} />
              </div>
              <p className="text-xs mt-2 text-ink-soft">{h.translation_pt}</p>
              <GrammarChipRow
                grammarUsed={h.grammar_used}
                showFurigana={showFurigana}
                jlptLevels={jlptLevels}
                className="mt-2"
              />
              {h.comprehension && h.comprehension.length > 0 && (
                <div className="mt-3">
                  <ComprehensionCheck
                    questions={h.comprehension}
                    answers={h.comprehensionAnswers ?? {}}
                    onAnswer={(qi, ci) => onAnswerComprehension(h.id, qi, ci)}
                  />
                </div>
              )}
              {h.source_url && (
                <a
                  href={h.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs mt-2 inline-flex items-center gap-1 underline underline-offset-2 text-indigo-soft"
                >
                  <ExternalLink size={12} />
                  Fonte: {h.source_title || h.source_url}
                </a>
              )}
              <div className="mt-3">
                <ReportText
                  source="shared"
                  sharedEntryId={h.id}
                  paragraph_jp={h.paragraph_jp}
                  translation_pt={h.translation_pt}
                  theme={h.theme}
                  readingDate={h.date}
                />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
