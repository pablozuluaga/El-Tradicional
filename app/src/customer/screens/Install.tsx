import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall, wasInstalled } from '../../pwa/install.ts'
import { detectPlatform } from '../../pwa/platform.ts'
import { Tono } from '../../ui/Tono.tsx'
import x from './Install.module.css'

const INSTALL_URL = 'el-tradicional.vercel.app/instalar'

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}

/** Landing page for the printed QR: one tap to install on Android, clear steps on iPhone. */
export function Install() {
  const nav = useNavigate()
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const installed = useSyncExternalStore(subscribeInstall, wasInstalled)
  const [platform] = useState(() => detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0))
  const [standalone] = useState(() => isStandalone())
  const [waited, setWaited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Chrome may take a moment to offer the install; after that, fall back to manual steps.
    const t = setTimeout(() => setWaited(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const install = async () => {
    setBusy(true)
    try { await promptInstall() } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText('https://' + INSTALL_URL); setCopied(true) } catch { /* ignore */ }
  }

  const done = standalone || installed
  const openMenu = <button type="button" className={x.cta} onClick={() => nav('/menu')}>Abrir el menú</button>

  let block
  if (done) {
    block = (
      <div className={x.done}>
        <div className={x.check} aria-hidden="true">✓</div>
        <div className={x.doneTitle}>¡Listo, ya tienes la app!</div>
        <div className={x.muted}>Búscala en tu pantalla de inicio con el logo de El Tradicional.</div>
        {openMenu}
      </div>
    )
  } else if (platform === 'inapp') {
    block = (
      <div className={x.steps}>
        <div className={x.stepsTitle}>Abre esta página en tu navegador</div>
        <div className={x.step}><span className={x.num}>1</span><span>Toca el menú <span className={x.chip}>⋯</span> o <span className={x.chip}>⋮</span> de esta ventana.</span></div>
        <div className={x.step}><span className={x.num}>2</span><span>Elige <b>Abrir en el navegador</b> (Chrome o Safari).</span></div>
        <button type="button" className={x.cta} style={{ height: 48, fontSize: 14.5, background: 'var(--ink)' }} onClick={copy}>{copied ? '¡Enlace copiado!' : 'Copiar el enlace'}</button>
      </div>
    )
  } else if (platform === 'ios') {
    block = (
      <>
        <div className={x.steps}>
          <div className={x.stepsTitle}>En iPhone son 3 toques</div>
          <div className={x.step}><span className={x.num}>1</span><span>Toca <span className={x.chip}><ShareIcon /> Compartir</span> en la barra de Safari (abajo).</span></div>
          <div className={x.step}><span className={x.num}>2</span><span>Desliza y elige <span className={x.chip}>＋ Agregar a inicio</span>.</span></div>
          <div className={x.step}><span className={x.num}>3</span><span>Toca <b>Agregar</b>. ¡Listo!</span></div>
        </div>
        <div className={x.pointer} aria-hidden="true">⬇</div>
      </>
    )
  } else if (platform === 'android' && canPrompt) {
    block = <button type="button" className={x.cta} disabled={busy} onClick={install}>⬇ Instalar la app</button>
  } else if (platform === 'android') {
    block = waited ? (
      <div className={x.steps}>
        <div className={x.stepsTitle}>Instálala desde Chrome</div>
        <div className={x.step}><span className={x.num}>1</span><span>Toca <span className={x.chip}>⋮</span> arriba a la derecha.</span></div>
        <div className={x.step}><span className={x.num}>2</span><span>Elige <b>Instalar aplicación</b> o <b>Agregar a pantalla principal</b>.</span></div>
      </div>
    ) : <button type="button" className={x.cta} disabled>Preparando…</button>
  } else {
    block = (
      <div className={x.steps}>
        <div className={x.stepsTitle}>Ábrela desde tu celular</div>
        <div className={x.step}><span className={x.num}>1</span><span>Escanea el código QR del restaurante o entra a <b>{INSTALL_URL}</b> en tu celular.</span></div>
        {canPrompt && <button type="button" className={x.cta} disabled={busy} onClick={install}>Instalar en este computador</button>}
      </div>
    )
  }

  return (
    <div className="app-shell light">
      <div className={`${x.page} noscroll`}>
        <div className={x.hero}>
          <img className={x.logo} src="/assets/logo.jpeg" alt="El Tradicional" />
          <div className={x.kicker}>Cocina típica · Envigado</div>
          <div className={x.title}>Lleva El Tradicional<br />en tu celular</div>
          <div className={x.sub}>Instala la app gratis: sin tiendas y sin ocupar espacio.</div>
        </div>
        <div className={x.body}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="bob" style={{ flex: 'none', width: 58, height: 67 }}><Tono variant="gate" width={58} height={67} /></div>
            <div style={{ fontSize: 13.5, color: 'var(--body)', lineHeight: 1.45 }}><b style={{ color: 'var(--ink)' }}>Toño:</b> Con la app pides en segundos y ves tu pedido en vivo.</div>
          </div>
          <div className={x.perks}>
            <div className={x.perk}><span className={x.perkIcon}>🛵</span>Pide a domicilio o para recoger</div>
            <div className={x.perk}><span className={x.perkIcon}>💬</span>Sigue tu pedido y chatea con el restaurante</div>
            <div className={x.perk}><span className={x.perkIcon}>🎉</span>-20% en tu primer pedido por la app</div>
          </div>
          {block}
          {!done && <button type="button" className={x.skip} onClick={() => nav('/')}>Seguir sin instalar →</button>}
        </div>
      </div>
    </div>
  )
}
