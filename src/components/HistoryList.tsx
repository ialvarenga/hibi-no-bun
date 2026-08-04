import FuriganaText from './FuriganaText'
import ComprehensionCheck from './ComprehensionCheck'
import type { ReadingEntry } from '../lib/types'

interface HistoryListProps {
  entries: ReadingEntry[]
  showFurigana: boolean
  jlptLevels: string[]
}

export default function HistoryList({ entries, showFurigana, jlptLevels }: HistoryListProps) {
  if (entries.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Histórico
      </h2>
      <div className="flex flex-col gap-3">
        {entries.map((h) => (
          <details
            key={h.date}
            className="border border-paper-line bg-card rounded-xl px-4 py-3"
          >
            <summary className="cursor-pointer text-sm flex items-center justify-between text-ink">
              <span>
                {h.date} · {h.theme}
              </span>
            </summary>
            <FuriganaText
              text={h.paragraph_jp}
              showReadings={showFurigana}
              jlptLevels={jlptLevels}
              vocab={h.vocab}
              className="block font-display text-base mt-3 leading-loose text-ink"
            />
            <p className="text-xs mt-2 text-ink-soft">{h.translation_pt}</p>
            {h.comprehension && h.comprehension.length > 0 && (
              <div className="mt-3">
                <ComprehensionCheck questions={h.comprehension} />
              </div>
            )}
          </details>
        ))}
      </div>
    </section>
  )
}
