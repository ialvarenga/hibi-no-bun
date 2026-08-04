import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateReading, type TopicInput } from './_lib/generateReading'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { topics, theme } = (req.body ?? {}) as {
    topics?: TopicInput[]
    theme?: string
  }

  if (!Array.isArray(topics) || topics.length === 0 || typeof theme !== 'string' || !theme.trim()) {
    res.status(400).json({ error: 'Corpo inválido: esperado { topics: [{jp, pt}], theme: string }' })
    return
  }

  const apiKeyHeader = req.headers['x-anthropic-api-key']
  const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader

  try {
    const reading = await generateReading(topics, theme, apiKey)
    res.status(200).json(reading)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('generate error:', err)
    res.status(500).json({ error: message })
  }
}
