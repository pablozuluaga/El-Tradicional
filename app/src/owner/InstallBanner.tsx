import { useState, useSyncExternalStore } from 'react'
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall, wasInstalled } from '../pwa/install.ts'
import { detectPlatform } from '../pwa/platform.ts'
import o from './o.module.css'

const HIDE_KEY = 'et:owner-install-hidden'

/**
 * "Install the panel" on Android: one tap opens Chrome's install dialog, so the owner doesn't
 * have to find the right line in Chrome's menu (the ⬇ icon there only saves an offline copy).
 */
export function InstallBanner() {
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const installed = useSyncExternalStore(subscribeInstall, wasInstalled)
  const [android] = useState(() => detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0) === 'android')
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false } })
  if (installed || hidden || isStandalone() || (!canPrompt && !android)) return null
  const hide = () => { setHidden(true); try { localStorage.setItem(HIDE_KEY, '1') } catch { /* private mode */ } }
  return (
    <div className={o.panel} style={{ borderColor: 'rgba(240,183,160,.35)' }}>
      <div className={o.panelHead} style={{ marginBottom: 6 }}>📲 Instala el panel en este celular</div>
      {canPrompt ? (
        <>
          <div style={{ fontSize: 12.5, color: '#c9bfae', marginBottom: 10, lineHeight: 1.45 }}>Queda como app “ET Dueño” en tu pantalla principal.</div>
          <button type="button" className={o.redBtn} style={{ width: '100%' }} onClick={() => void promptInstall()}>Instalar el panel</button>
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: '#e7ddce', lineHeight: 1.5 }}>
          En Chrome toca <b>⋮</b> (arriba a la derecha) y baja hasta <b>“Agregar a la pantalla principal”</b> o <b>“Instalar app”</b>, luego <b>Instalar</b>.
          <br /><span style={{ color: '#F6C88B' }}>No toques la flecha ⬇ de arriba del menú: esa solo guarda una copia de la página sin internet.</span>
        </div>
      )}
      <button type="button" className={o.quitar} style={{ marginTop: 10 }} onClick={hide}>Ya lo instalé · ocultar</button>
    </div>
  )
}
