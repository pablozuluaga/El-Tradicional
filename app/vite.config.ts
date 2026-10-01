import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Two pages, one bundle: index.html (customer app) and admin.html (owner panel at /admin).
    rolldownOptions: { input: { index: 'index.html', admin: 'admin.html' } },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // src/pwa/update.ts registers it and reloads on new versions
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'owner-apple-touch-icon.png', 'owner-icon-192.png', 'assets/logo.jpeg'],
      // Two apps from one site: public/manifest.webmanifest (customers, /) and
      // public/admin.webmanifest (owner, /admin), linked from index.html and admin.html.
      manifest: false,
      workbox: {
        // take over right away; src/pwa/update.ts then reloads open pages onto the new version
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        // /admin must get admin.html (its manifest makes "Add to Home Screen" open the panel).
        navigateFallbackDenylist: [/^\/admin(\/|$)/],
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // The report generator is only used by the owner; fetch it on demand instead of precaching it.
        globIgnores: ['**/exceljs*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === 'navigate' && /^\/admin(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'et-admin-page', networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/') && /\.(webp|jpe?g|png)$/.test(url.pathname),
            handler: 'CacheFirst',
            // bump the name when photos change under the same file name (old cache is deleted in src/pwa/update.ts)
            options: { cacheName: 'et-images-v2', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
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
