import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the same build works both at a GitHub Pages subpath
  // (username.github.io/repo-name) and later at the root of a custom
  // domain, without needing to change this when the domain gets wired up.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'favicon-32.png'],
      manifest: {
        name: 'BMRI — Burning Man Rave Intelligence',
        short_name: 'BMRI',
        description: 'Offline music-discovery and journey planner for the RSL 2026 Burning Man guide.',
        theme_color: '#0b0b12',
        background_color: '#0b0b12',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Without this, the SPA's navigateFallback (needed so client-side
        // routing survives a refresh) also swallows <a download> clicks for
        // files that aren't precached — e.g. the PDF/EPUB — and serves
        // index.html instead of the actual file. Exclude them explicitly.
        navigateFallbackDenylist: [/\.pdf$/i, /\.epub$/i],
      },
    }),
  ],
})
