import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'owner-apple-touch-icon.png', 'owner-icon-192.png', 'assets/logo.jpeg'],
      // Two apps from one site: public/manifest.webmanifest (customers, /) and
      // public/admin.webmanifest (owner, /admin); index.html links the right one.
      manifest: false,
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
