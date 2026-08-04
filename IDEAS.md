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

## Backlog

1. **Listen mode (TTS)** — Web Speech API reading the paragraph aloud for pronunciation/listening
   practice, basically free to add.
2. **Grammar point explanations** — tapping a `grammar_used` chip shows a short explanation plus
   another example sentence, rather than just a label.
3. **Full streak calendar** — contribution-graph-style view instead of just the last 7 days.
4. **Search/filter history** by theme or grammar point.
5. **Sentence mining / writing practice** — user writes a short reaction/summary in Japanese,
   submitted for AI feedback.
