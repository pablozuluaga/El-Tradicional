/**
 * Install support for the /instalar page. Chrome fires `beforeinstallprompt` once, early,
 * so this module is imported from main.tsx to catch it before any page renders.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export const subscribeInstall = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const canPromptInstall = () => deferred !== null
export const wasInstalled = () => installed

/** Shows Chrome's install dialog. Resolves true if the customer accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  emit()
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') { installed = true; emit() }
  return outcome === 'accepted'
}

/** Opened from the home-screen icon rather than a browser tab. */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export type Platform = 'ios' | 'android' | 'inapp' | 'desktop'

/** Which instructions to show. In-app browsers (Instagram, Facebook…) can't install at all. */
export function detectPlatform(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0): Platform {
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly/i.test(ua)) return 'inapp'
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}
