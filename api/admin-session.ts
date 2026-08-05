import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyPassword, createSessionCookie, clearSessionCookie } from './_lib/adminAuth'

// Owner login/logout. POST { password } sets the session cookie; DELETE clears
// it. The password is never stored anywhere client-side — only the signed,
// HttpOnly cookie is.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie(host))
    res.status(200).json({ ok: true })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { password } = (req.body ?? {}) as { password?: unknown }

  try {
    if (!verifyPassword(password)) {
      res.status(401).json({ error: 'Senha incorreta.' })
      return
    }
    res.setHeader('Set-Cookie', createSessionCookie(host))
    res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('admin-session error:', err)
    res.status(500).json({ error: message })
  }
}
