import GrammarChip from './GrammarChip'

interface GrammarChipRowProps {
  grammarUsed: string[] | undefined
  showFurigana: boolean
  jlptLevels: string[]
  className?: string
}

export default function GrammarChipRow({
  grammarUsed,
  showFurigana,
  jlptLevels,
  className = '',
}: GrammarChipRowProps) {
  if (!grammarUsed || grammarUsed.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {grammarUsed.map((g, i) => (
        <GrammarChip key={i} label={g} showFurigana={showFurigana} jlptLevels={jlptLevels} />
      ))}
    </div>
  )
}
