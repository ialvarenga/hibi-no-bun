import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import FuriganaText from './FuriganaText'
import GrammarChipRow from './GrammarChipRow'
import ComprehensionCheck from './ComprehensionCheck'
import SpeakButton from './SpeakButton'
import { resolveGrammarTopic } from '../lib/constants'
import type { ReadingEntry } from '../lib/types'

interface HistoryListProps {
  entries: ReadingEntry[]
  showFurigana: boolean
  jlptLevels: string[]
}

function grammarLabel(raw: string): string {
  return resolveGrammarTopic(raw)?.pt ?? raw
}

export default function HistoryList({ entries, showFurigana, jlptLevels }: HistoryListProps) {
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState('')
  const [grammar, setGrammar] = useState('')

  const themes = useMemo(
    () => Array.from(new Set(entries.map((h) => h.theme))).sort((a, b) => a.localeCompare(b)),
    [entries],
  )
  const grammarOptions = useMemo(
    () =>
      Array.from(new Set(entries.flatMap((h) => (h.grammar_used ?? []).map(grammarLabel)))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [entries],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((h) => {
      if (theme && h.theme !== theme) return false
      if (grammar && !(h.grammar_used ?? []).some((g) => grammarLabel(g) === grammar)) return false
      if (
        q &&
        !h.theme.toLowerCase().includes(q) &&
        !h.translation_pt.toLowerCase().includes(q) &&
        !h.paragraph_jp.toLowerCase().includes(q) &&
        !(h.source_title ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [entries, query, theme, grammar])

  if (entries.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-indigo">
        Histórico
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full border border-paper-line bg-card rounded-lg pl-8 pr-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-indigo-soft"
          />
        </div>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="border border-paper-line bg-card rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-indigo-soft"
        >
          <option value="">Todos os temas</option>
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={grammar}
          onChange={(e) => setGrammar(e.target.value)}
          className="border border-paper-line bg-card rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-indigo-soft"
        >
          <option value="">Toda a gramática</option>
          {grammarOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum resultado para esse filtro.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((h) => (
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
                  <ComprehensionCheck questions={h.comprehension} />
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
