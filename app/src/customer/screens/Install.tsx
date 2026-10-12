import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { WHATSAPP_URL } from '../../config.ts'
import { canDetectInstalledApp, canPromptInstall, hasInstalledApp, isStandalone, promptInstall, subscribeInstall, wasInstalled } from '../../pwa/install.ts'
import { androidNeedsChrome, chromeIntentUrl, detectGuide, detectPlatform, openAppIntentUrl } from '../../pwa/platform.ts'
import { WhatsAppIcon } from '../../ui/ui.tsx'
import { GUIDES, START_AT, type Step } from '../install/guides.tsx'
import { AndroidHome, IosHome } from '../install/scenes.tsx'
import g from '../install/install.module.css'
import x from './Install.module.css'

const INSTALL_URL = 'el-tradicional.vercel.app/instalar'
/** How long to wait for Chrome's install button before showing the menu steps. */
const PROMPT_WAIT_MS = 2500
/**
 * After "Instalar", Android needs a while (longer on older phones) to put the app on the phone;
 * opening it before that lands in the browser again. Chrome can tell when it's really there, so
 * the page asks every POLL_MS; browsers that can't tell wait FALLBACK_MS instead.
 */
const POLL_MS = 1500
const SETTLE_MS = 1500
const MAX_WAIT_MS = 90_000
const FALLBACK_MS = 20_000

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
  // the "Empieza aquí" arrow waits until the customer has read the steps and asks for it
  const [armed, setArmed] = useState(false)

  // already installed on this phone (Chrome on Android can tell): go straight to "Abrir la app"
  const [foundInstalled, setFoundInstalled] = useState(false)
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), PROMPT_WAIT_MS)
    void hasInstalledApp().then(yes => { if (yes) { setFoundInstalled(true); setAppReady(true) } })
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!installed) return
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const ready = () => { if (alive) setAppReady(true) }
    if (!canDetectInstalledApp()) {
      timers.push(setTimeout(ready, FALLBACK_MS))
    } else {
      const started = Date.now()
      const check = async () => {
        if (!alive) return
        if (await hasInstalledApp()) timers.push(setTimeout(ready, SETTLE_MS))
        else if (Date.now() - started > MAX_WAIT_MS) ready()
        else timers.push(setTimeout(check, POLL_MS))
      }
      timers.push(setTimeout(check, POLL_MS))
    }
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [installed])

  const android = platform === 'android' || (platform === 'inapp' && /Android/i.test(ua))
  const iphone = platform === 'ios' || (platform === 'inapp' && !android)
  const needsChrome = android && (platform === 'inapp' || androidNeedsChrome(ua))
  const done = standalone || installed || foundInstalled
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
  const start = showSteps && armed && firstVisible && startId ? START_AT[startId] : undefined
  const startReading = () => {
    setArmed(true)
    firstStep.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const readyCard = (
    <Action title="¿Ya leíste los pasos?" text="Toca el botón y te mostramos con una flecha dónde empezar en tu pantalla.">
      <button type="button" className={x.cta} onClick={startReading}>Sí, mostrarme dónde empezar</button>
    </Action>
  )

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
          <div className={x.body} style={{ paddingTop: 48 }}>
            <div className={x.done}>
              <div className={x.check} aria-hidden="true">✓</div>
              <div className={x.doneTitle}>{standalone ? 'Ya estás en la app' : '¡Listo, ya tienes la app!'}</div>
              {standalone ? (
                <button type="button" className={x.cta} onClick={() => nav('/menu')}>Ver el menú</button>
              ) : android ? (
                <>
                  <div className={x.muted}>Ábrela con este botón o desde el ícono de El Tradicional en tu pantalla principal.</div>
                  {appReady
                    ? <a className={x.cta} href={openAppIntentUrl(location.origin + '/', location.origin + '/instalar')}>Abrir la app</a>
                    : (
                      <>
                        <button type="button" className={x.cta} disabled>Terminando de instalar…</button>
                        <div className={x.muted}>Espera un momento: el botón se activa solo cuando la app esté lista en tu celular.</div>
                      </>
                    )}
                </>
              ) : (
                <div className={x.muted}>Ahora <b>cierra Safari</b> y abre el ícono rojo de <b>El Tradicional</b> en tu pantalla de inicio.</div>
              )}
            </div>
            {!standalone && (
              <section className={g.step}>
                <div className={g.sceneWrap}>{android ? <AndroidHome /> : <IosHome />}</div>
                <p className={g.stepText}>
                  {android
                    ? <>Si se vuelve a abrir aquí en el navegador, cierra esta pestaña y toca el ícono de <b>El Tradicional</b> en tu pantalla principal (o en el cajón de apps).</>
                    : <>El ícono queda junto a tus otras apps. Desde ahí se abre a pantalla completa, como cualquier app.</>}
                </p>
              </section>
            )}
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
              {readyCard}
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
              {readyCard}
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
