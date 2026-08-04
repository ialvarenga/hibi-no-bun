import { describe, expect, it } from 'vitest'
import { parseFurigana, stripFurigana } from './furigana'

describe('parseFurigana', () => {
  it('splits kanji+reading runs from the surrounding plain text', () => {
    expect(parseFurigana('私[わたし]は日本語[にほんご]を勉強[べんきょう]しています。')).toEqual([
      { text: '私', reading: 'わたし' },
      { text: 'は' },
      { text: '日本語', reading: 'にほんご' },
      { text: 'を' },
      { text: '勉強', reading: 'べんきょう' },
      { text: 'しています。' },
    ])
  })

  it('keeps trailing okurigana attached to the kanji it belongs to', () => {
    expect(parseFurigana('多く[おおく]の人[ひと]')).toEqual([
      { text: '多く', reading: 'おおく' },
      { text: 'の' },
      { text: '人', reading: 'ひと' },
    ])
  })

  it('does not sweep a leading particle into the kanji match', () => {
    expect(parseFurigana('は花[はな]')).toEqual([{ text: 'は' }, { text: '花', reading: 'はな' }])
  })

  it('passes through text with no furigana untouched', () => {
    expect(parseFurigana('こんにちは')).toEqual([{ text: 'こんにちは' }])
  })
})

describe('stripFurigana', () => {
  it('removes the bracketed reading but keeps the kanji and okurigana', () => {
    expect(stripFurigana('私[わたし]は多く[おおく]の人[ひと]を見[み]た。')).toBe(
      '私は多くの人を見た。',
    )
  })

  it('is a no-op on text with no furigana', () => {
    expect(stripFurigana('こんにちは')).toBe('こんにちは')
  })
})
