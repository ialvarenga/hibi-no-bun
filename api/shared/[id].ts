import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSharedById } from '../_lib/sharedDb'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!id) {
    res.status(400).json({ error: 'Id inválido' })
    return
  }

  try {
    const entry = await getSharedById(id)
    if (!entry) {
      res.status(404).json({ error: 'Pergunta compartilhada não encontrada.' })
      return
    }
    res.status(200).json(entry)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('shared get-by-id error:', err)
    res.status(500).json({ error: message })
  }
}
