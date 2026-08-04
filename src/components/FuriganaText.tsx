import { useEffect, useMemo, useRef, useState } from 'react'
import { parseFurigana, type FuriganaSegment } from '../lib/furigana'
import type { VocabItem } from '../lib/types'

interface FuriganaTextProps {
  text: string
  showReadings: boolean
  vocab?: VocabItem[]
  className?: string
}

function matchVocab(segment: FuriganaSegment, vocab: VocabItem[]): VocabItem | undefined {
  if (!segment.reading) return undefined
  return vocab.find(
    (v) =>
      (v.word.startsWith(segment.text) && v.reading.startsWith(segment.reading!)) ||
      (segment.text.startsWith(v.word) && segment.reading!.startsWith(v.reading)),
  )
}

export default function FuriganaText({
  text,
  showReadings,
  vocab = [],
  className,
}: FuriganaTextProps) {
  const segments = useMemo(() => parseFurigana(text), [text])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => setActiveIndex(null), [text])

  useEffect(() => {
    if (activeIndex === null) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActiveIndex(null)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [activeIndex])

  return (
    <span ref={rootRef} className={className}>
      {segments.map((segment, i) => {
        if (!segment.reading) return <span key={i}>{segment.text}</span>

        const match = matchVocab(segment, vocab)
        const isActive = activeIndex === i

        return (
          <span key={i} className="relative">
            <ruby
              className={match ? 'cursor-pointer' : undefined}
              onClick={
                match
                  ? (e) => {
                      e.stopPropagation()
                      setActiveIndex((cur) => (cur === i ? null : i))
                    }
                  : undefined
              }
            >
              {segment.text}
              {showReadings && (
                <rt className="text-[0.5em] font-body font-normal text-ink-soft select-none">
                  {segment.reading}
                </rt>
              )}
            </ruby>
            {isActive && match && (
              <span className="absolute left-1/2 top-full z-10 mt-1.5 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-left text-xs leading-snug text-paper shadow-lg">
                <span className="block font-display text-sm">
                  {match.word}（{match.reading}）
                </span>
                <span className="block text-paper/80">{match.meaning_pt}</span>
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
