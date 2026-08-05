import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSharedById, deleteSharedEntry } from '../_lib/sharedDb'
import { isAuthed } from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!id) {
    res.status(400).json({ error: 'Id inválido' })
    return
  }

  // Owner-only: remove a reported text from the community pool.
  if (req.method === 'DELETE') {
    if (!isAuthed(req.headers.cookie)) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    try {
      const ok = await deleteSharedEntry(id)
      if (!ok) {
        res.status(404).json({ error: 'Pergunta compartilhada não encontrada.' })
        return
      }
      res.status(200).json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('shared delete error:', err)
      res.status(500).json({ error: message })
    }
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
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
