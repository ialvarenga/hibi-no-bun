# Feature ideas backlog

Ideas for extending 日々の一文 beyond the current daily-reading loop, roughly ordered by
learning impact. Add to this list as new ideas come up; move an item into the codebase (and
out of here, or mark it done) once it ships.

## Status

- [x] **Vocab flashcard review (SRS)** — every entry generates 5-8 `vocab` items but they were
      never seen again after that day. Added a Leitner-style spaced repetition review over the
      vocab accumulated across history (`src/lib/db.ts`, `src/components/VocabReview.tsx`).

- [x] **Click-to-lookup on the paragraph itself** — tapping a kanji word in the paragraph now
      shows its reading/meaning in an inline popover, matched against the entry's `vocab` list
      (`src/components/FuriganaText.tsx`).

- [x] **JLPT level control** — the prompt's target level is now a per-profile setting
      (`jlptLevels: string[]` on `Profile`, default N4+N3) instead of a hardcoded "N4-N3",
      editable via multi-select toggle pills in Settings (`src/components/SettingsPanel.tsx`,
      `src/lib/constants.ts`) and joined (e.g. "N3-N2") into the generation prompt
      (`api/_lib/generateReading.ts`).

- [x] **Comprehension check** — the generation prompt now also produces 2 multiple-choice
      questions per paragraph (`comprehension: ComprehensionQuestion[]` on `ReadingEntry`,
      `api/_lib/generateReading.ts`), rendered as an interactive quiz with instant right/wrong
      feedback on both today's card and history entries (`src/components/ComprehensionCheck.tsx`).

- [x] **Level-aware furigana** — the furigana toggle used to be all-or-nothing; it now shows
      readings only for kanji above the hardest of the user's selected JLPT levels, using a
      bundled kanji→JLPT-level table derived from davidluzgouveia/kanji-data (MIT)
      (`src/lib/kanjiLevels.ts`, `src/lib/kanjiLevel.ts`, `src/components/FuriganaText.tsx`).
      The manual toggle still hides everything when turned off.

- [x] **Listen mode (TTS)** — Web Speech API reading the paragraph aloud for pronunciation/listening
      practice. An "Ouvir" button (`src/components/SpeakButton.tsx`, `src/lib/tts.ts`) strips the
      furigana annotations and speaks the paragraph with a `ja-JP` voice, on today's card and each
      history entry.

- [x] **Grammar point explanations** — tapping a `grammar_used` chip now shows a popover with a
      short explanation and an example sentence, instead of just a label. To avoid LLM
      hallucination, the explanations are a static, hand-authored dataset
      (`src/lib/grammarExplanations.ts`) grounded in Tae Kim's Guide to Japanese
      (guidetojapanese.org, CC BY-NC-SA 2.5) rather than generated per request, with a "Leia mais"
      link back to the source chapter. `grammar_used` now stores topic ids (validated against the
      known list in `api/_lib/generateReading.ts`) instead of free-text, resolved via
      `resolveGrammarTopic` (`src/lib/constants.ts`, with a legacy free-text fallback) and rendered
      by `src/components/GrammarChip.tsx` on both today's card and history entries.

- [x] **Full streak calendar** — a "Ver calendário completo" toggle under the last-7-days row
      expands a GitHub-style contribution graph (52 weeks, month labels, weekday labels) built
      from `completedDates` (`src/lib/date.ts:lastNWeeks`, `src/components/StreakCalendar.tsx`,
      `src/components/StreakStamps.tsx`).

- [x] **Search/filter history** by theme or grammar point — the history section now has a free-text
      search box (matches theme, translation, paragraph text, source title) plus theme and grammar
      dropdowns populated from the entries actually present, all combined client-side
      (`src/components/HistoryList.tsx`).

## Backlog

1. **Sentence mining / writing practice** — user writes a short reaction/summary in Japanese,
   submitted for AI feedback.
