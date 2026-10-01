import { registerSW } from 'virtual:pwa-register'

// Registers the service worker. With `registerType: 'autoUpdate'` the page reloads by itself once a
// new version has taken over, so a deploy reaches installed apps without the user doing anything.
// Home-screen apps (iPhone especially) resume from memory instead of reloading, so also look for a
// new version whenever the app comes back to the foreground, and every hour while it stays open.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) void reg.update().catch(() => {}) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 60 * 60 * 1000)
  },
})

// Photos are cached by file name; when they change, vite.config.ts uses a new cache and the old one goes.
if ('caches' in window) void caches.delete('et-images').catch(() => {})
