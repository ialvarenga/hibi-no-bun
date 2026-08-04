import { useMemo } from 'react'
import { parseFurigana } from '../lib/furigana'

interface FuriganaTextProps {
  text: string
  showReadings: boolean
  className?: string
}

export default function FuriganaText({ text, showReadings, className }: FuriganaTextProps) {
  const segments = useMemo(() => parseFurigana(text), [text])

  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.reading ? (
          <ruby key={i}>
            {segment.text}
            {showReadings && (
              <rt className="text-[0.5em] font-body font-normal text-ink-soft select-none">
                {segment.reading}
              </rt>
            )}
          </ruby>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </span>
  )
}
