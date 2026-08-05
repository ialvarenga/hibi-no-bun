import { createHmac, timingSafeEqual } from 'node:crypto'

// Single-owner session auth. There is no user system — one shared owner
// password (ADMIN_PASSWORD) is exchanged for an HMAC-signed, HttpOnly session
// cookie signed with SESSION_SECRET. Keeps the secret out of the URL/logs
// (unlike a ?token= approach), unreadable by JS (HttpOnly), and revocable by
// rotating SESSION_SECRET. Uses only Node's built-in crypto — no dependency.

const COOKIE_NAME = 'admin_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET não configurado no servidor.')
  return secret
}

// Constant-time string compare that also tolerates length mismatches without
// leaking length via early return / throw.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still run a compare against a same-length buffer so timing doesn't branch
    // on length, then return false.
    timingSafeEqual(ab, Buffer.alloc(ab.length))
    return false
  }
  return timingSafeEqual(ab, bb)
}

export function verifyPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof input !== 'string' || input.length === 0) return false
  return safeEqual(input, expected)
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

// Whether to add the Secure attribute. A Secure cookie is dropped by browsers
// over plain http, which would break `npm run dev` on http://localhost — so
// omit it there and require it everywhere else.
function isSecureHost(host: string | undefined): boolean {
  if (!host) return true
  return !/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
}

export function createSessionCookie(host?: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString(
    'base64url',
  )
  const value = `${payload}.${sign(payload)}`
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (isSecureHost(host)) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearSessionCookie(host?: string): string {
  const attrs = [`${COOKIE_NAME}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0']
  if (isSecureHost(host)) attrs.push('Secure')
  return attrs.join('; ')
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

// Validates the session cookie's signature and expiry. Takes a cookie header
// string so it works from both the Vercel handler (req.headers.cookie) and the
// Vite dev middleware (req.headers.cookie).
export function isAuthed(cookieHeader: string | undefined): boolean {
  const raw = readCookie(cookieHeader, COOKIE_NAME)
  if (!raw) return false
  const dot = raw.lastIndexOf('.')
  if (dot === -1) return false
  const payload = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)

  let expectedSig: string
  try {
    expectedSig = sign(payload)
  } catch {
    return false
  }
  if (!safeEqual(sig, expectedSig)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}
