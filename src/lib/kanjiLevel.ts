import { KANJI_JLPT_LEVEL } from './kanjiLevels'

// N5 (5) is easiest, N1 (1) is hardest — matches KANJI_JLPT_LEVEL's scale.
const LEVEL_NUMBER: Record<string, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 }

// The hardest level among the ones the user selected is treated as their
// current studying level: kanji at or below it (easier or equal) are assumed
// already known, kanji above it are not.
function studyThreshold(jlptLevels: string[]): number {
  const numbers = jlptLevels.map((l) => LEVEL_NUMBER[l]).filter((n): n is number => n !== undefined)
  return numbers.length > 0 ? Math.min(...numbers) : LEVEL_NUMBER.N5
}

const KANJI_RANGE = /[一-鿿々〻]/

// Kanji missing from the table (proper nouns, rare/non-jouyou characters)
// are treated as unknown, since they're generally not something a learner
// would already have memorized regardless of JLPT level.
function isCharKnown(char: string, threshold: number): boolean {
  const level = KANJI_JLPT_LEVEL[char]
  return level !== undefined && level >= threshold
}

// A run of text (which may contain multiple kanji, e.g. a compound word, or
// trailing okurigana like 多く/新しい) needs its furigana shown if any KANJI
// character in it is above the user's studied level — partial furigana
// within a single word reads as broken. Non-kanji characters (okurigana,
// punctuation) are skipped: they're never "unknown" themselves, and
// counting them would force furigana to always show for any word with
// okurigana regardless of the selected JLPT levels.
export function needsFurigana(text: string, jlptLevels: string[]): boolean {
  const threshold = studyThreshold(jlptLevels)
  for (const char of text) {
    if (KANJI_RANGE.test(char) && !isCharKnown(char, threshold)) return true
  }
  return false
}
