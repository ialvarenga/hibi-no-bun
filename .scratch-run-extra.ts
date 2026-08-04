import { extraScenarios } from './.scratch-extra-scenarios'

const KANJI_RE = /[一-鿿々〻]/g
const FURIGANA_PATTERN = /([一-鿿々〻]+)\[([^[\]]+)\]/g

function findUnannotatedKanji(text: string): number {
  const covered = new Array(text.length).fill(false)
  for (const m of text.matchAll(FURIGANA_PATTERN)) {
    for (let i = m.index!; i < m.index! + m[0].length; i++) covered[i] = true
  }
  let missed = 0
  for (const m of text.matchAll(KANJI_RE)) {
    if (!covered[m.index!]) missed++
  }
  return missed
}

async function run(label: string, modulePath: string) {
  const { generateReading } = await import(modulePath)
  const key = process.env.ANTHROPIC_API_KEY!
  let totalMissed = 0
  let totalKanjiChars = 0
  for (const [i, s] of extraScenarios.entries()) {
    const result = await generateReading(s.topics, s.theme, key)
    const missed = findUnannotatedKanji(result.paragraph_jp)
    const kanjiCount = (result.paragraph_jp.match(KANJI_RE) || []).length
    totalKanjiChars += kanjiCount
    totalMissed += missed
    console.log(`[${label}] scenario ${i + 1} (${s.theme}): missed ${missed}/${kanjiCount} kanji`)
  }
  console.log(`[${label}] TOTAL missed: ${totalMissed} / ${totalKanjiChars} kanji chars across ${extraScenarios.length} runs`)
  return { totalMissed, totalKanjiChars }
}

async function main() {
  await run('NEW', './.scratch-gr')
  await run('BASELINE', './.scratch-gr-original')
}

main().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
