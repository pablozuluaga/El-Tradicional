import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'assets/logo.jpeg'],
      manifest: {
        name: 'El Tradicional',
        short_name: 'El Tradicional',
        description: 'Cocina típica · Envigado. Pide tu almuerzo a domicilio o para recoger.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#C8161D',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // The report generator is only used by the owner; fetch it on demand instead of precaching it.
        globIgnores: ['**/exceljs*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && /\.(webp|jpe?g|png)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'et-images', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'et-fonts' },
          },
        ],
      },
    }),
  ],
})
