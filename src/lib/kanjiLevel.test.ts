import { describe, expect, it } from 'vitest'
import { needsFurigana } from './kanjiLevel'

describe('needsFurigana', () => {
  it('does not require furigana for kanji at the studied level', () => {
    // 私 is N4; studying up to N4 means it's assumed already known
    expect(needsFurigana('私', ['N4'])).toBe(false)
  })

  it('requires furigana for kanji harder than the studied level', () => {
    // 亜 is N1; someone studying only N5 hasn't learned it yet
    expect(needsFurigana('亜', ['N5'])).toBe(true)
  })

  it('uses the hardest of multiple selected levels as the threshold', () => {
    // 私 (N4) needs furigana if you've only selected N5, but not once N1 is
    // also selected, since the hardest selected level becomes the threshold
    expect(needsFurigana('私', ['N5'])).toBe(true)
    expect(needsFurigana('私', ['N5', 'N1'])).toBe(false)
  })

  it('treats kanji missing from the table as unknown regardless of level', () => {
    expect(needsFurigana('鬱', ['N1'])).toBe(true)
  })

  it('ignores non-kanji characters', () => {
    expect(needsFurigana('です。', ['N5'])).toBe(false)
  })
})
