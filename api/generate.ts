import type { VercelRequest, VercelResponse } from '@vercel/node'
import { waitUntil } from '@vercel/functions'
import { generateReading, type TopicInput } from './_lib/generateReading'
import { saveSharedEntry } from './_lib/sharedDb'

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

  const apiKeyHeader = req.headers['x-anthropic-api-key']
  const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader

  try {
    const reading = await generateReading(
      topics,
      theme,
      apiKey,
      Array.isArray(recentTopics) ? recentTopics.filter((t) => typeof t === 'string') : [],
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
          topicsUsed: topics.map((t) => t.pt),
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
