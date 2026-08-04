import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { resolveGrammarTopic } from '../lib/constants'
import { GRAMMAR_EXPLANATIONS } from '../lib/grammarExplanations'
import FuriganaText from './FuriganaText'

interface GrammarChipProps {
  label: string
  showFurigana: boolean
  jlptLevels: string[]
}

export default function GrammarChip({ label, showFurigana, jlptLevels }: GrammarChipProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  const topic = resolveGrammarTopic(label)
  const info = topic ? GRAMMAR_EXPLANATIONS[topic.id] : undefined

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [open])

  if (!topic || !info) {
    return <span className="text-xs rounded-full px-2.5 py-1 bg-moss/10 text-moss">{label}</span>
  }

  return (
    <span ref={rootRef} className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="cursor-pointer text-xs rounded-full px-2.5 py-1 bg-moss/10 text-moss border-b border-dotted border-moss/70"
      >
        {label}
      </span>
      {open && (
        <span className="absolute left-0 top-full z-10 mt-1.5 w-72 max-w-[85vw] rounded-lg bg-ink px-3 py-2.5 text-left text-xs leading-snug text-paper shadow-lg">
          <span className="block font-display text-sm mb-1">
            {topic.jp}（{topic.pt}）
          </span>
          <span className="block text-paper/90 mb-2">{info.explanation_pt}</span>
          <FuriganaText
            text={info.example_jp}
            showReadings={showFurigana}
            jlptLevels={jlptLevels}
            className="block font-display text-sm leading-loose text-paper mb-1"
          />
          <span className="block text-paper/70 mb-2">{info.example_pt}</span>
          <a
            href={info.source_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 underline underline-offset-2 text-paper/80"
          >
            <ExternalLink size={11} />
            Leia mais
          </a>
        </span>
      )}
    </span>
  )
}
