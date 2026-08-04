# Feature ideas backlog

Ideas for extending 日々の一文 beyond the current daily-reading loop, roughly ordered by
learning impact. Add to this list as new ideas come up; move an item into the codebase (and
out of here, or mark it done) once it ships.

## Status

- [x] **Vocab flashcard review (SRS)** — every entry generates 5-8 `vocab` items but they were
      never seen again after that day. Added a Leitner-style spaced repetition review over the
      vocab accumulated across history (`src/lib/db.ts`, `src/components/VocabReview.tsx`).

## Backlog

1. **Click-to-lookup on the paragraph itself** — `FuriganaText.tsx` already parses word-level
   segments; tapping a word to show its reading/meaning inline (instead of only the separate
   vocab list) would connect vocab to context.
2. **Comprehension check** — 1-2 auto-generated multiple-choice questions per paragraph (from
   the same model call that generates the reading) to force active recall instead of passive
   reading + translation reveal.
3. **Listen mode (TTS)** — Web Speech API reading the paragraph aloud for pronunciation/listening
   practice, basically free to add.
4. **JLPT level control** — currently hardcoded to N4-N3 in the prompt
   (`api/_lib/generateReading.ts`); exposing this as a setting lets the app grow with the user.
5. **Grammar point explanations** — tapping a `grammar_used` chip shows a short explanation plus
   another example sentence, rather than just a label.
6. **Full streak calendar** — contribution-graph-style view instead of just the last 7 days.
7. **Search/filter history** by theme or grammar point.
8. **Sentence mining / writing practice** — user writes a short reaction/summary in Japanese,
   submitted for AI feedback.
