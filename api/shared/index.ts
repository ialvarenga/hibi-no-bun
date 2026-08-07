import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRandomShared } from '../_lib/sharedDb'
import { ALLOWED_JLPT_LEVELS } from '../_lib/constants'

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

  const jlptLevelParam = req.query.jlptLevel
  const jlptLevels = (
    Array.isArray(jlptLevelParam) ? jlptLevelParam.join(',') : (jlptLevelParam ?? '')
  )
    .split(',')
    .map((l) => l.trim())
    .filter((l) => ALLOWED_JLPT_LEVELS.includes(l))

  try {
    const entry = await getRandomShared(excludeIds, jlptLevels)
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
