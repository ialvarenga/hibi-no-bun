import { useState } from 'react'
import { Flag, Loader2, Check } from 'lucide-react'
import { FEEDBACK_CATEGORIES } from '../lib/constants'
import { submitFeedback } from '../lib/api'
import type { FeedbackCategory } from '../lib/types'

interface ReportTextProps {
  source: 'own' | 'shared'
  sharedEntryId?: string
  paragraph_jp: string
  translation_pt?: string
  theme?: string
  jlptLevel?: string
  readingDate?: string
}

// Self-contained "report this text" widget. Renders a chip button that opens an
// inline panel (pick which part is wrong + optional comment) and submits
// directly via the api client, so it can be dropped into any card without
// threading handlers through App. Mirrors the submit-once-then-confirm flow of
// ComprehensionCheck and the chip styling used across TodayCard.
export default function ReportText({
  source,
  sharedEntryId,
  paragraph_jp,
  translation_pt,
  theme,
  jlptLevel,
  readingDate,
}: ReportTextProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!category) return
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        category,
        comment: comment.trim() || undefined,
        source,
        sharedEntryId,
        paragraph_jp,
        translation_pt,
        theme,
        jlptLevel,
        readingDate,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <p className="text-xs mt-3 inline-flex items-center gap-1.5 text-moss">
        <Check size={13} className="shrink-0" /> Obrigado pelo feedback!
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-ink-soft"
      >
        <Flag size={13} /> Reportar erro
      </button>
    )
  }

  return (
    <div className="mt-3 border border-paper-line rounded-xl p-3 bg-paper">
      <p className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo">
        O que está errado?
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FEEDBACK_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`border rounded-full px-3 py-1.5 text-xs ${
              category === c.id
                ? 'border-indigo bg-indigo/10 text-indigo'
                : 'border-paper-line text-ink-soft'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Descreva o problema (opcional)"
        rows={3}
        maxLength={1000}
        className="w-full border border-paper-line bg-card rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-indigo-soft mb-3"
      />
      {error && <p className="text-xs mb-2 text-vermillion">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void handleSubmit()}
          disabled={!category || submitting}
          className="bg-indigo text-white rounded-full px-4 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="text-xs text-ink-soft disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
