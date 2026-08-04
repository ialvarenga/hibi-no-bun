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
      (`jlptLevel` on `Profile`) instead of a hardcoded "N4-N3", editable via a dropdown in
      Settings (`src/components/SettingsPanel.tsx`, `src/lib/constants.ts`) and threaded through
      to the generation prompt (`api/_lib/generateReading.ts`).

## Backlog

1. **Comprehension check** — 1-2 auto-generated multiple-choice questions per paragraph (from
   the same model call that generates the reading) to force active recall instead of passive
   reading + translation reveal.
2. **Listen mode (TTS)** — Web Speech API reading the paragraph aloud for pronunciation/listening
   practice, basically free to add.
3. **Grammar point explanations** — tapping a `grammar_used` chip shows a short explanation plus
   another example sentence, rather than just a label.
4. **Full streak calendar** — contribution-graph-style view instead of just the last 7 days.
5. **Search/filter history** by theme or grammar point.
6. **Sentence mining / writing practice** — user writes a short reaction/summary in Japanese,
   submitted for AI feedback.
