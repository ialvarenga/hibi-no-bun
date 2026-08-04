import { generateReading } from './.scratch-gr'

const KANJI_RE = /[一-鿿々〻]/g
const FURIGANA_PATTERN = /([一-鿿々〻]+)\[([^[\]]+)\]/g

function findUnannotatedKanji(text: string): { char: string; index: number; context: string }[] {
  const covered = new Array(text.length).fill(false)
  for (const m of text.matchAll(FURIGANA_PATTERN)) {
    for (let i = m.index!; i < m.index! + m[0].length; i++) covered[i] = true
  }
  const missed: { char: string; index: number; context: string }[] = []
  for (const m of text.matchAll(KANJI_RE)) {
    if (!covered[m.index!]) {
      missed.push({
        char: m[0],
        index: m.index!,
        context: text.slice(Math.max(0, m.index! - 5), m.index! + 6),
      })
    }
  }
  return missed
}

const scenarios: { topics: { jp: string; pt: string }[]; theme: string }[] = [
  { topics: [{ jp: '受け身', pt: 'Voz passiva' }, { jp: '使役形', pt: 'Causativo' }], theme: 'Notícias' },
  { topics: [{ jp: 'て形', pt: 'Forma て' }, { jp: '比較', pt: 'Comparação' }], theme: 'Viagem' },
  { topics: [{ jp: '尊敬語', pt: 'Honorífico (respeito)' }, { jp: '可能形', pt: 'Forma potencial' }], theme: 'Esportes' },
  { topics: [{ jp: 'やりもらい', pt: 'Dar e receber' }, { jp: '意向形', pt: 'Volitivo' }], theme: 'Culinária' },
]

async function main() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('no key')

  let totalMissed = 0
  let retriesTriggered = 0
  for (const [i, s] of scenarios.entries()) {
    console.log(`\n=== Scenario ${i + 1}: theme=${s.theme} ===`)
    const originalError = console.error
    let sawRetryLog = false
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('retrying')) sawRetryLog = true
      originalError(...args)
    }
    const result = await generateReading(s.topics, s.theme, key)
    console.error = originalError
    if (sawRetryLog) retriesTriggered++
    console.log('paragraph_jp:', result.paragraph_jp)
    const missed = findUnannotatedKanji(result.paragraph_jp)
    if (missed.length === 0) {
      console.log('-> All kanji annotated. PASS')
    } else {
      totalMissed += missed.length
      console.log(`-> MISSING FURIGANA for ${missed.length} kanji:`, missed)
    }
  }
  console.log(`\nTOTAL missed kanji across ${scenarios.length} runs:`, totalMissed)
  console.log(`Retries triggered (chatty first response): ${retriesTriggered}/${scenarios.length}`)
}

main().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
