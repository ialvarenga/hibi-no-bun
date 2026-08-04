import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Serves POST /api/generate during `npm run dev` using the same handler logic
// deployed as a Vercel Function, so local dev needs no extra process.
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
            const { topics, theme } = JSON.parse(body || '{}')
            if (!Array.isArray(topics) || topics.length === 0 || !theme) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Corpo inválido: esperado { topics, theme }' }))
              return
            }
            const { generateReading } = await import('./api/_lib/generateReading')
            const reading = await generateReading(topics, theme)
            res.end(JSON.stringify(reading))
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
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env so ANTHROPIC_API_KEY is available to the dev API middleware.
  // The key has no VITE_ prefix, so it is never exposed to client code.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
  }

  return {
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
