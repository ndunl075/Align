import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_PUBLIC_SITE_URL || '').replace(/\/$/, '')

  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'align-html-meta',
        transformIndexHtml(html) {
          if (!siteUrl) return html
          const tag = `    <meta property="og:url" content="${siteUrl}/" />\n`
          return html.replace('<meta name="twitter:card"', `${tag}<meta name="twitter:card"`)
        },
      },
    ],
  }
})
