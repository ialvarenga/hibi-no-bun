import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Serves POST /api/generate and the /api/shared* routes during `npm run dev`
// using the same handler logic deployed as Vercel Functions, so local dev
// needs no extra process (no `vercel dev`).
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/generate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const { topics, theme, recentTopics, jlptLevel, share } = JSON.parse(body || '{}')
            if (!Array.isArray(topics) || topics.length === 0 || !theme) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Corpo inválido: esperado { topics, theme }' }))
              return
            }
            const apiKeyHeader = req.headers['x-anthropic-api-key']
            const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader
            const { generateReading } = await import('./api/_lib/generateReading.js')
            const reading = await generateReading(
              topics,
              theme,
              apiKey,
              Array.isArray(recentTopics) ? recentTopics.filter((t) => typeof t === 'string') : [],
              typeof jlptLevel === 'string' && jlptLevel.trim() ? jlptLevel.trim() : undefined,
            )
            res.end(JSON.stringify(reading))

            // Dev's Node process stays alive between requests, so — unlike
            // the Vercel Function, which needs waitUntil() — a plain
            // fire-and-forget call here is safe.
            if (share === true) {
              const { saveSharedEntry } = await import('./api/_lib/sharedDb.js')
              saveSharedEntry({
                ...reading,
                date: new Date().toISOString().slice(0, 10),
                theme,
                topicsUsed: topics.map((t: { pt: string }) => t.pt),
                jlptLevel,
              }).catch((err: unknown) => console.error('dev saveSharedEntry error:', err))
            }
          } catch (err) {
            console.error('dev /api/generate error:', err)
            res.statusCode = 500
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Erro desconhecido',
              }),
            )
          }
        })
      })

      server.middlewares.use('/api/shared', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        res.setHeader('Content-Type', 'application/json')
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const { getRandomShared, getSharedById } = await import('./api/_lib/sharedDb.js')
          const id = url.pathname.replace(/^\/+/, '')
          if (id) {
            const entry = await getSharedById(id)
            if (!entry) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Pergunta compartilhada não encontrada.' }))
              return
            }
            res.end(JSON.stringify(entry))
            return
          }
          const excludeIds = (url.searchParams.get('exclude') ?? '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
          const entry = await getRandomShared(excludeIds)
          if (!entry) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Nenhuma pergunta compartilhada disponível ainda.' }))
            return
          }
          res.end(JSON.stringify(entry))
        } catch (err) {
          console.error('dev /api/shared error:', err)
          res.statusCode = 500
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
          )
        }
      })

      const readJsonBody = (req: import('node:http').IncomingMessage): Promise<any> =>
        new Promise((resolve) => {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              resolve(JSON.parse(body || '{}'))
            } catch {
              resolve({})
            }
          })
        })

      server.middlewares.use('/api/admin-session', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const host = req.headers.host
        try {
          const { verifyPassword, createSessionCookie, clearSessionCookie } = await import(
            './api/_lib/adminAuth.js'
          )
          if (req.method === 'DELETE') {
            res.setHeader('Set-Cookie', clearSessionCookie(host))
            res.end(JSON.stringify({ ok: true }))
            return
          }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }
          const { password } = await readJsonBody(req)
          if (!verifyPassword(password)) {
            res.statusCode = 401
            res.end(JSON.stringify({ error: 'Senha incorreta.' }))
            return
          }
          res.setHeader('Set-Cookie', createSessionCookie(host))
          res.end(JSON.stringify({ ok: true }))
        } catch (err) {
          console.error('dev /api/admin-session error:', err)
          res.statusCode = 500
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
          )
        }
      })

      server.middlewares.use('/api/feedback', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const { saveFeedback, listFeedback, setFeedbackResolved } = await import(
            './api/_lib/feedbackDb.js'
          )
          const { isAuthed } = await import('./api/_lib/adminAuth.js')
          const { sendFeedbackEmail } = await import('./api/_lib/notify.js')
          const { FEEDBACK_CATEGORIES, FEEDBACK_SOURCES } = await import('./api/_lib/constants.js')

          const clamp = (value: unknown, max: number): string | null => {
            if (typeof value !== 'string') return null
            const trimmed = value.trim()
            return trimmed ? trimmed.slice(0, max) : null
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req)
            if (typeof body.category !== 'string' || !FEEDBACK_CATEGORIES.includes(body.category)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Categoria inválida' }))
              return
            }
            if (typeof body.source !== 'string' || !FEEDBACK_SOURCES.includes(body.source)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Origem inválida' }))
              return
            }
            const paragraph = clamp(body.paragraph_jp, 2000)
            if (!paragraph) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Texto reportado ausente' }))
              return
            }
            const row = await saveFeedback({
              category: body.category,
              comment: clamp(body.comment, 1000),
              source: body.source,
              sharedEntryId: typeof body.sharedEntryId === 'string' ? body.sharedEntryId : null,
              paragraph_jp: paragraph,
              translation_pt: clamp(body.translation_pt, 2000),
              theme: clamp(body.theme, 200),
              jlptLevel: clamp(body.jlptLevel, 50),
              readingDate: clamp(body.readingDate, 20),
            })
            res.end(JSON.stringify({ ok: true }))
            // Dev's Node process stays alive between requests, so a plain
            // fire-and-forget is safe (no waitUntil needed here).
            const appUrl = req.headers.host ? `http://${req.headers.host}` : undefined
            sendFeedbackEmail(row, appUrl).catch((err: unknown) =>
              console.error('dev sendFeedbackEmail error:', err),
            )
            return
          }

          if (!isAuthed(req.headers.cookie)) {
            res.statusCode = 401
            res.end(JSON.stringify({ error: 'Não autenticado' }))
            return
          }

          if (req.method === 'GET') {
            res.end(JSON.stringify(await listFeedback()))
            return
          }

          if (req.method === 'PATCH') {
            const { id, resolved } = await readJsonBody(req)
            if (typeof id !== 'string' || typeof resolved !== 'boolean') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Corpo inválido: esperado { id, resolved }' }))
              return
            }
            const ok = await setFeedbackResolved(id, resolved)
            if (!ok) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Feedback não encontrado' }))
              return
            }
            res.end(JSON.stringify({ ok: true }))
            return
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (err) {
          console.error('dev /api/feedback error:', err)
          res.statusCode = 500
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }),
          )
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env so ANTHROPIC_API_KEY/DATABASE_URL are available to the dev API
  // middleware. Neither has a VITE_ prefix, so they're never exposed to
  // client code.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
  }
  if (env.DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL
  }
  if (env.POSTGRES_URL && !process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL = env.POSTGRES_URL
  }
  // Server-only secrets for the feedback dashboard + owner login and the
  // Resend notification. None are VITE_-prefixed, so they never reach the
  // client bundle.
  for (const key of [
    'ADMIN_PASSWORD',
    'SESSION_SECRET',
    'RESEND_API_KEY',
    'FEEDBACK_EMAIL_TO',
    'FEEDBACK_EMAIL_FROM',
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
    plugins: [
      react(),
      devApi(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['hanko.svg'],
        manifest: {
          name: '日々の一文 — Leitura diária de japonês',
          short_name: '日々の一文',
          description:
            'Um parágrafo por dia em japonês, adaptado aos tópicos gramaticais que você já estudou.',
          lang: 'pt-BR',
          start_url: '/',
          display: 'standalone',
          background_color: '#EFE9DC',
          theme_color: '#223A5E',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
  }
})
