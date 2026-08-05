import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import { generateReading, type TopicInput } from './_lib/generateReading'
import { saveSharedEntry } from './_lib/sharedDb'
import { ALLOWED_THEMES, ALLOWED_JLPT_LEVELS, CANONICAL_TOPICS } from './_lib/constants'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { topics, theme, recentTopics, jlptLevel, share } = (req.body ?? {}) as {
    topics?: TopicInput[]
    theme?: string
    recentTopics?: string[]
    jlptLevel?: string
    share?: boolean
  }

  if (!Array.isArray(topics) || topics.length === 0 || typeof theme !== 'string' || !theme.trim()) {
    res.status(400).json({ error: 'Corpo inválido: esperado { topics: [{id, jp, pt}], theme: string }' })
    return
  }

  // Every one of these values is spliced into the LLM prompt, so each is
  // resolved against a fixed server-side allow-list rather than trusted
  // as-is — a request can't smuggle arbitrary text into the prompt through
  // theme, topics, or jlptLevel, even by calling this endpoint directly.
  if (!ALLOWED_THEMES.includes(theme)) {
    res.status(400).json({ error: 'Tema inválido' })
    return
  }

  const canonicalTopics: TopicInput[] = []
  for (const t of topics) {
    const canonical = t && typeof t.id === 'string' ? CANONICAL_TOPICS[t.id] : undefined
    if (!canonical) {
      res.status(400).json({ error: 'Tópico inválido' })
      return
    }
    canonicalTopics.push({ id: t.id, jp: canonical.jp, pt: canonical.pt })
  }

  // The client sends a hyphen-joined combination of the selected levels
  // (e.g. "N4-N3"), which is the range format the prompt expects — so each
  // part is checked against the allow-list, not the whole joined string.
  if (jlptLevel !== undefined && String(jlptLevel).trim()) {
    const levels = String(jlptLevel).trim().split('-')
    if (levels.some((level) => !ALLOWED_JLPT_LEVELS.includes(level))) {
      res.status(400).json({ error: 'Nível JLPT inválido' })
      return
    }
  }

  const apiKeyHeader = req.headers['x-anthropic-api-key']
  const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader

  try {
    const reading = await generateReading(
      canonicalTopics,
      theme,
      apiKey,
      Array.isArray(recentTopics)
        ? recentTopics
            .filter((t) => typeof t === 'string')
            .slice(0, 10)
            .map((t) => t.slice(0, 200))
        : [],
      typeof jlptLevel === 'string' && jlptLevel.trim() ? jlptLevel.trim() : undefined,
    )
    res.status(200).json(reading)

    // Runs after the response is already on the wire — the client never
    // waits on this. waitUntil keeps the function alive long enough to
    // finish the write even though res.json() already returned.
    if (share === true) {
      waitUntil(
        saveSharedEntry({
          ...reading,
          date: new Date().toISOString().slice(0, 10),
          theme,
          topicsUsed: canonicalTopics.map((t) => t.pt),
          jlptLevel,
        }).catch((err) => {
          console.error('saveSharedEntry error:', err)
        }),
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('generate error:', err)
    res.status(500).json({ error: message })
  }
}
