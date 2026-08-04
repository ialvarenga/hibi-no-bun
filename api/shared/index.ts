import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRandomShared } from '../_lib/sharedDb'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const excludeParam = req.query.exclude
  const excludeIds = (Array.isArray(excludeParam) ? excludeParam.join(',') : (excludeParam ?? ''))
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  try {
    const entry = await getRandomShared(excludeIds)
    if (!entry) {
      res.status(404).json({ error: 'Nenhuma pergunta compartilhada disponível ainda.' })
      return
    }
    res.status(200).json(entry)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('shared random error:', err)
    res.status(500).json({ error: message })
  }
}
