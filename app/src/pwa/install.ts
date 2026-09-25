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
