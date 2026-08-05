import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import { saveFeedback, listFeedback, setFeedbackResolved } from './_lib/feedbackDb'
import { sendFeedbackEmail } from './_lib/notify'
import { isAuthed } from './_lib/adminAuth'
import { FEEDBACK_CATEGORIES, FEEDBACK_SOURCES } from './_lib/constants'

const COMMENT_MAX = 1000
const SNAPSHOT_MAX = 2000

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---- Submit (public) ----
  if (req.method === 'POST') {
    const body = (req.body ?? {}) as Record<string, unknown>

    if (typeof body.category !== 'string' || !FEEDBACK_CATEGORIES.includes(body.category as never)) {
      res.status(400).json({ error: 'Categoria inválida' })
      return
    }
    if (typeof body.source !== 'string' || !FEEDBACK_SOURCES.includes(body.source as never)) {
      res.status(400).json({ error: 'Origem inválida' })
      return
    }
    const paragraph = clamp(body.paragraph_jp, SNAPSHOT_MAX)
    if (!paragraph) {
      res.status(400).json({ error: 'Texto reportado ausente' })
      return
    }

    try {
      const row = await saveFeedback({
        category: body.category,
        comment: clamp(body.comment, COMMENT_MAX),
        source: body.source,
        sharedEntryId: typeof body.sharedEntryId === 'string' ? body.sharedEntryId : null,
        paragraph_jp: paragraph,
        translation_pt: clamp(body.translation_pt, SNAPSHOT_MAX),
        theme: clamp(body.theme, 200),
        jlptLevel: clamp(body.jlptLevel, 50),
        readingDate: clamp(body.readingDate, 20),
      })

      res.status(200).json({ ok: true })

      // Fire-and-forget after the response — the user never waits on the
      // e-mail (same pattern as api/generate.ts's shared-save).
      const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
      const appUrl = req.headers.host ? `${proto}://${req.headers.host}` : undefined
      waitUntil(sendFeedbackEmail(row, appUrl))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('feedback submit error:', err)
      res.status(500).json({ error: message })
    }
    return
  }

  // ---- Owner-only from here ----
  if (!isAuthed(req.headers.cookie)) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }

  if (req.method === 'GET') {
    try {
      const rows = await listFeedback()
      res.status(200).json(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('feedback list error:', err)
      res.status(500).json({ error: message })
    }
    return
  }

  if (req.method === 'PATCH') {
    const { id, resolved } = (req.body ?? {}) as { id?: unknown; resolved?: unknown }
    if (typeof id !== 'string' || typeof resolved !== 'boolean') {
      res.status(400).json({ error: 'Corpo inválido: esperado { id, resolved }' })
      return
    }
    try {
      const ok = await setFeedbackResolved(id, resolved)
      if (!ok) {
        res.status(404).json({ error: 'Feedback não encontrado' })
        return
      }
      res.status(200).json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('feedback patch error:', err)
      res.status(500).json({ error: message })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
