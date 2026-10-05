import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { WHATSAPP_URL } from '../../config.ts'
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall, wasInstalled } from '../../pwa/install.ts'
import { androidNeedsChrome, chromeIntentUrl, detectGuide, detectPlatform } from '../../pwa/platform.ts'
import { WhatsAppIcon } from '../../ui/ui.tsx'
import { GUIDES, START_AT, type Step } from '../install/guides.tsx'
import g from '../install/install.module.css'
import x from './Install.module.css'

const INSTALL_URL = 'el-tradicional.vercel.app/instalar'
/** How long to wait for Chrome's install button before showing the menu steps. */
const PROMPT_WAIT_MS = 2500

const START_CLASS = { 'bottom-left': g.bottomLeft, 'bottom-center': g.bottomCenter, 'bottom-right': g.bottomRight, 'top-right': g.topRight }

function StepCard({ step, i, n, cardRef }: { step: Step; i: number; n: number; cardRef?: React.Ref<HTMLElement> }) {
  return (
    <section ref={cardRef} className={g.step} aria-label={`Paso ${i + 1} de ${n}`}>
      <div className={g.stepHead}>
        <span className={g.stepNum} aria-hidden="true">{i + 1}</span>
        <div><div className={g.stepOf}>Paso {i + 1} de {n}</div><div className={g.stepTitle}>{step.title}</div></div>
      </div>
      {step.scene && <div className={g.sceneWrap}>{step.scene}</div>}
      <p className={g.stepText}>{step.text}</p>
    </section>
  )
}

function Steps({ steps, firstRef }: { steps: Step[]; firstRef?: React.Ref<HTMLElement> }) {
  return (
    <div className={g.steps}>
      {steps.map((s, i) => <StepCard key={i} step={s} i={i} n={steps.length} cardRef={i === 0 ? firstRef : undefined} />)}
    </div>
  )
}

/** A big action card: what to do in one sentence, then the button. */
function Action({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <section className={x.action}>
      <div className={x.actionTitle}>{title}</div>
      {text && <p className={x.actionText}>{text}</p>}
      {children}
    </section>
  )
}

/**
 * Landing page for the printed QR. It goes straight to the one thing that works on this phone:
 * a single "Instalar" button on Android Chrome (old Chrome versions too); on other Android
 * browsers, whose menus change between versions, a button that reopens the page in Chrome; on
 * iPhone, the Safari steps drawn for this iOS version. There is no picker for other phones.
 */
export function Install() {
  const nav = useNavigate()
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const installed = useSyncExternalStore(subscribeInstall, wasInstalled)
  const [ua] = useState(() => navigator.userAgent)
  const [guideId] = useState(() => detectGuide(ua, navigator.maxTouchPoints ?? 0))
  const [platform] = useState(() => detectPlatform(ua, navigator.maxTouchPoints ?? 0))
  const [standalone] = useState(() => isStandalone())
  const [waited, setWaited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const firstStep = useRef<HTMLElement>(null)
  const [firstVisible, setFirstVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), PROMPT_WAIT_MS)
    return () => clearTimeout(t)
  }, [])

  const android = platform === 'android' || (platform === 'inapp' && /Android/i.test(ua))
  const iphone = platform === 'ios' || (platform === 'inapp' && !android)
  const needsChrome = android && (platform === 'inapp' || androidNeedsChrome(ua))
  const done = standalone || installed
  // what this phone sees: exactly one of these, never a choice between them
  const mode = done ? 'done'
    : platform === 'desktop' ? 'desktop'
    : android && canPrompt ? 'button'
    : needsChrome ? 'chrome'
    : android ? (waited ? 'androidSteps' : 'waiting')
    : 'iphone'

  const iosGuide = guideId === 'ios27' || guideId === 'ios26' || guideId === 'ios18' || guideId === 'iosChrome' || guideId === 'inapp' ? GUIDES[guideId] : GUIDES.ios18
  const showSteps = mode === 'androidSteps' || mode === 'iphone'
  useEffect(() => {
    const el = firstStep.current
    if (!showSteps || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setFirstVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [showSteps])
  const startId = mode === 'androidSteps' ? 'androidChrome' : iphone ? iosGuide.id : null
  const start = showSteps && firstVisible && startId ? START_AT[startId] : undefined

  const install = async () => {
    setBusy(true)
    try { await promptInstall() } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText('https://' + INSTALL_URL); setCopied(true) } catch { /* the link stays visible to copy by hand */ }
  }
  const copyButton = (label: string) => (
    <>
      <button type="button" className={x.second} onClick={copy}>{copied ? '✓ Enlace copiado' : label}</button>
      <div className={x.link}>{INSTALL_URL}</div>
    </>
  )

  if (mode === 'done') {
    return (
      <div className="app-shell light">
        <div className={`${x.page} noscroll`}>
          <div className={x.body} style={{ paddingTop: 60 }}>
            <div className={x.done}>
              <div className={x.check} aria-hidden="true">✓</div>
              <div className={x.doneTitle}>¡Listo, ya tienes la app!</div>
              <div className={x.muted}>Búscala en tu pantalla de inicio con el logo de El Tradicional.</div>
              <button type="button" className={x.cta} onClick={() => nav('/menu')}>Abrir el menú</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell light">
      <div className={`${x.page} noscroll`}>
        <div className={x.hero}>
          <img className={x.logo} src="/assets/logo.jpeg" alt="El Tradicional" />
          <div className={x.title}>Instala la app de<br />El Tradicional</div>
          <div className={x.sub}>Gratis, sin tiendas y sin contraseñas. -20% en tu primer pedido.</div>
        </div>
        <div className={x.body}>
          {mode === 'desktop' && (
            <div className={g.qrCard}>
              <div className={g.stepTitle}>Ábrela desde tu celular</div>
              <img className={g.qr} src="/assets/qr-instalar.svg" alt={`Código QR de ${INSTALL_URL}`} />
              <div className={x.muted}>Apunta la cámara de tu celular a este código, o entra a <b>{INSTALL_URL}</b>.</div>
              {canPrompt && <button type="button" className={x.cta} disabled={busy} onClick={install}>Instalar en este computador</button>}
            </div>
          )}

          {(mode === 'button' || mode === 'waiting') && (
            <Action title="Toca el botón y luego “Instalar”" text="Se abre una ventanita: toca Instalar. No pide permisos ni cuenta.">
              <button type="button" className={x.cta} disabled={busy || mode === 'waiting'} onClick={install}>
                {mode === 'waiting' ? 'Preparando…' : '⬇ Instalar la app'}
              </button>
            </Action>
          )}

          {mode === 'chrome' && (
            <Action title="Ábrela en Chrome para instalarla" text={<>Toca el botón: la página se abre en <b>Chrome</b> y ahí te aparece el botón para instalar.</>}>
              <a className={x.cta} href={chromeIntentUrl('https://' + INSTALL_URL)}>Abrir en Chrome</a>
              <details className={g.tip}>
                <summary>¿No se abrió Chrome?</summary>
                <p className={g.stepText} style={{ marginBottom: 12 }}>Copia el enlace, abre <b>Chrome</b> y pégalo arriba, en la barra de la dirección.</p>
                {copyButton('Copiar el enlace')}
                {guideId === 'samsung' && (
                  <>
                    <p className={g.stepText} style={{ margin: '16px 0 12px' }}>Si no tienes Chrome, prueba desde este mismo navegador:</p>
                    <Steps steps={GUIDES.samsung.steps} />
                  </>
                )}
              </details>
            </Action>
          )}

          {mode === 'androidSteps' && (
            <>
              <div className={x.hint}>Sigue los pasos. En cada dibujo, <b>la flecha roja</b> te muestra dónde tocar.</div>
              <Steps steps={GUIDES.androidChrome.steps} firstRef={firstStep} />
              {GUIDES.androidChrome.tip && (
                <details className={g.tip}>
                  <summary>{GUIDES.androidChrome.tip.title}</summary>
                  <Steps steps={GUIDES.androidChrome.tip.steps} />
                </details>
              )}
            </>
          )}

          {mode === 'iphone' && (
            <>
              <div className={x.hint}>Sigue los pasos. En cada dibujo, <b>la flecha roja</b> te muestra dónde tocar.</div>
              <Steps steps={iosGuide.steps} firstRef={firstStep} />
              {(iosGuide.id === 'inapp' || iosGuide.id === 'iosChrome') && (
                <Action title="¿No te aparece la opción?" text={<>Copia el enlace, abre <b>Safari</b> y pégalo arriba, en la barra de la dirección.</>}>
                  {copyButton('Copiar el enlace')}
                </Action>
              )}
            </>
          )}

          {mode !== 'desktop' && (
            <div className={x.alt}>
              <div className={x.altTitle}>¿No puedes instalarla?</div>
              <p className={x.altText}>No pasa nada: puedes pedir igual desde aquí, sin instalar nada.</p>
              <button type="button" className={x.second} onClick={() => nav('/')}>Pedir sin instalar</button>
              <a className={x.wa} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20} />Ayuda por WhatsApp</a>
            </div>
          )}
        </div>
      </div>
      {start && (
        <div className={`${g.start} ${START_CLASS[start]}`} aria-hidden="true">
          <span>Empieza aquí</span><i>{start === 'top-right' ? '⬆' : '⬇'}</i>
        </div>
      )}
    </div>
  )
}
