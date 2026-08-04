// Parses the bracket furigana notation the model is prompted to produce,
// e.g. "私[わたし]は日本語[にほんご]を勉強[べんきょう]しています。" — a run of
// kanji, optionally followed by trailing okurigana (e.g. 多く[おおく], 新しい
// [あたらしい]), immediately followed by its reading in square brackets. Text
// outside that pattern (kana, punctuation, or plain strings with no
// annotations at all) passes through untouched, so this is safe to run on
// any string. The kanji and okurigana runs are captured separately (rather
// than as one mixed character class) so a leading particle like は can't be
// swept into the match — see the parser tests.
const FURIGANA_PATTERN = /([一-鿿々〻]+)([ぁ-ん]*)\[([^[\]]+)\]/g

export interface FuriganaSegment {
  text: string
  reading?: string
}

export function parseFurigana(input: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = []
  let lastIndex = 0

  for (const match of input.matchAll(FURIGANA_PATTERN)) {
    const [full, kanji, okurigana, reading] = match
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, index) })
    }
    segments.push({ text: kanji + okurigana, reading })
    lastIndex = index + full.length
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) })
  }

  return segments
}

export function stripFurigana(input: string): string {
  return input.replace(FURIGANA_PATTERN, '$1$2')
}
