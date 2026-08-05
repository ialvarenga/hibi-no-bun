import { useEffect, useState } from 'react'
import { Sparkles, Loader2, ExternalLink, Eye, EyeOff, CaseSensitive, RefreshCw } from 'lucide-react'
import HankoStamp from './HankoStamp'
import FuriganaText from './FuriganaText'
import GrammarChipRow from './GrammarChipRow'
import ComprehensionCheck from './ComprehensionCheck'
import SpeakButton from './SpeakButton'
import ReportText from './ReportText'
import type { ReadingEntry } from '../lib/types'

interface TodayCardProps {
  entry: ReadingEntry | null
  generating: boolean
  error: string | null
  onGenerate: () => void
  showFurigana: boolean
  onToggleFurigana: () => void
  jlptLevels: string[]
  onAnswerComprehension: (questionIndex: number, choiceIndex: number) => void
}

export default function TodayCard({
  entry,
  generating,
  error,
  onGenerate,
  showFurigana,
  onToggleFurigana,
  jlptLevels,
  onAnswerComprehension,
}: TodayCardProps) {
  const [showTranslation, setShowTranslation] = useState(false)

  // Regenerating today's paragraph reuses this same component instance —
  // don't leave the previous paragraph's translation revealed.
  useEffect(() => setShowTranslation(false), [entry?.paragraph_jp])

  return (
    <section className="border border-paper-line bg-card rounded-2xl p-6 mb-8 relative">
      <div className="absolute top-4 right-4">
        <HankoStamp size={44}>今日</HankoStamp>
      </div>

      {!entry && (
        <div className="text-center py-6">
          <p className="text-sm mb-5 text-ink-soft">Ainda sem parágrafo hoje.</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="bg-indigo text-white rounded-full px-6 py-3 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Buscando e escrevendo...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Gerar parágrafo de hoje
              </>
            )}
          </button>
          {error && <p className="text-xs mt-3 text-vermillion">{error}</p>}
        </div>
      )}

      {entry && (
        <div>
          <p className="text-xs mb-3 text-ink-soft">Tema: {entry.theme}</p>
          <FuriganaText
            text={entry.paragraph_jp}
            showReadings={showFurigana}
            jlptLevels={jlptLevels}
            vocab={entry.vocab}
            className="block font-display text-xl leading-loose mb-4 pr-12 text-ink"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            <SpeakButton text={entry.paragraph_jp} />
            <button
              onClick={() => setShowTranslation((s) => !s)}
              className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-indigo-soft"
            >
              {showTranslation ? <EyeOff size={13} /> : <Eye size={13} />}
              {showTranslation ? 'Ocultar tradução' : 'Revelar tradução'}
            </button>
            <button
              onClick={onToggleFurigana}
              className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-indigo-soft"
            >
              <CaseSensitive size={13} />
              {showFurigana ? 'Ocultar furigana' : 'Mostrar furigana'}
            </button>
            <button
              onClick={onGenerate}
              disabled={generating}
              className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-indigo-soft disabled:opacity-60"
            >
              <RefreshCw size={13} className={generating ? 'animate-spin' : undefined} />
              {generating ? 'Gerando...' : 'Gerar novo parágrafo'}
            </button>
          </div>
          {showTranslation && (
            <p className="text-sm mb-5 text-ink-soft">{entry.translation_pt}</p>
          )}
          {error && <p className="text-xs mb-4 text-vermillion">{error}</p>}

          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo">
              Vocabulário
            </h3>
            <div className="grid gap-1.5">
              {(entry.vocab ?? []).map((v, i) => (
                <div key={i} className="flex items-baseline gap-2 text-sm text-ink">
                  <span className="font-display">{v.word}</span>
                  <span className="text-xs text-ink-soft">({v.reading})</span>
                  <span className="text-xs text-ink-soft">— {v.meaning_pt}</span>
                </div>
              ))}
            </div>
          </div>

          <GrammarChipRow
            grammarUsed={entry.grammar_used}
            showFurigana={showFurigana}
            jlptLevels={jlptLevels}
            className="mb-4"
          />

          <ComprehensionCheck
            questions={entry.comprehension ?? []}
            answers={entry.comprehensionAnswers ?? {}}
            onAnswer={onAnswerComprehension}
          />

          {entry.source_url && (
            <a
              href={entry.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs inline-flex items-center gap-1 underline underline-offset-2 text-indigo-soft"
            >
              <ExternalLink size={12} />
              Fonte: {entry.source_title || entry.source_url}
            </a>
          )}

          <div className="mt-4">
            <ReportText
              source="own"
              paragraph_jp={entry.paragraph_jp}
              translation_pt={entry.translation_pt}
              theme={entry.theme}
              readingDate={entry.date}
            />
          </div>
        </div>
      )}
    </section>
  )
}
