import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { WHATSAPP_URL } from '../../config.ts'
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall, wasInstalled } from '../../pwa/install.ts'
import { detectGuide, type GuideId } from '../../pwa/platform.ts'
import { Tono } from '../../ui/Tono.tsx'
import { ANDROID_ONE_TAP, GUIDE_ORDER, GUIDES, START_AT, type Step } from '../install/guides.tsx'
import g from '../install/install.module.css'
import x from './Install.module.css'

const INSTALL_URL = 'el-tradicional.vercel.app/instalar'
type PhoneGuide = Exclude<GuideId, 'desktop'>

const START_CLASS = { 'bottom-left': g.bottomLeft, 'bottom-center': g.bottomCenter, 'bottom-right': g.bottomRight, 'top-right': g.topRight }

function StepCard({ step, i, n, children, cardRef }: { step: Step; i: number; n: number; children?: ReactNode; cardRef?: React.Ref<HTMLElement> }) {
  return (
    <section ref={cardRef} className={g.step} aria-label={`Paso ${i + 1} de ${n}`}>
      <div className={g.stepHead}>
        <span className={g.stepNum} aria-hidden="true">{i + 1}</span>
        <div><div className={g.stepOf}>Paso {i + 1} de {n}</div><div className={g.stepTitle}>{step.title}</div></div>
      </div>
      {step.scene && <div className={g.sceneWrap}>{step.scene}</div>}
      <p className={g.stepText}>{step.text}</p>
      {children}
    </section>
  )
}

/**
 * Landing page for the printed QR. Shows the install steps for this phone and browser, each with
 * a drawing of the screen and a red arrow on what to tap; other phones are one chip away.
 */
export function Install() {
  const nav = useNavigate()
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const installed = useSyncExternalStore(subscribeInstall, wasInstalled)
  const [detected] = useState(() => detectGuide(navigator.userAgent, navigator.maxTouchPoints ?? 0))
  const [standalone] = useState(() => isStandalone())
  const [guideId, setGuideId] = useState<PhoneGuide>(detected === 'desktop' ? 'androidChrome' : detected)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  // the "start here" arrow shows while step 1 is on screen, so it never covers later steps
  const firstStep = useRef<HTMLElement>(null)
  const [firstVisible, setFirstVisible] = useState(false)

  const install = async () => {
    setBusy(true)
    try { await promptInstall() } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText('https://' + INSTALL_URL); setCopied(true) } catch { /* ignore */ }
  }

  const done = standalone || installed
  const guide = GUIDES[guideId]
  const oneTap = guideId === 'androidChrome' && canPrompt && !manual
  const steps = oneTap ? ANDROID_ONE_TAP : guide.steps
  useEffect(() => {
    const el = firstStep.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setFirstVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [guideId, oneTap])
  const start = !done && firstVisible && guideId === detected ? START_AT[guideId] : undefined

  if (done) {
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
          <div className={x.kicker}>Cocina típica · Envigado</div>
          <div className={x.title}>Lleva El Tradicional<br />en tu celular</div>
          <div className={x.sub}>Instala la app gratis en 1 minuto: sin tiendas, sin contraseñas y sin ocupar espacio.</div>
        </div>
        <div className={x.body}>
          <div className={x.perks}>
            <div className={x.perk}><span className={x.perkIcon}>🛵</span>Pide a domicilio o para recoger</div>
            <div className={x.perk}><span className={x.perkIcon}>💬</span>Sigue tu pedido y chatea con el restaurante</div>
            <div className={x.perk}><span className={x.perkIcon}>🎉</span>-20% en tu primer pedido por la app</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="bob" style={{ flex: 'none', width: 58, height: 67 }}><Tono variant="gate" width={58} height={67} /></div>
            <div style={{ fontSize: 13.5, color: 'var(--body)', lineHeight: 1.45 }}>
              <b style={{ color: 'var(--ink)' }}>Toño:</b> Sigue los pasos de abajo. En cada dibujo, <b style={{ color: 'var(--red)' }}>la flecha roja</b> te muestra dónde tocar.
            </div>
          </div>

          {detected === 'desktop' && (
            <div className={g.qrCard}>
              <div className={g.stepTitle}>Ábrela desde tu celular</div>
              <img className={g.qr} src="/assets/qr-instalar.svg" alt={`Código QR de ${INSTALL_URL}`} />
              <div className={x.muted}>Apunta la cámara de tu celular a este código, o entra a <b>{INSTALL_URL}</b>. Allá verás estos mismos pasos.</div>
              {canPrompt && <button type="button" className={x.cta} disabled={busy} onClick={install}>Instalar en este computador</button>}
            </div>
          )}

          <div>
            <div className={g.pickLabel}>
              {detected === 'desktop' ? 'Pasos según el celular:' : <>Guía para tu celular · <b>¿se ve distinto?</b> Elige otro:</>}
            </div>
            <div className={`${g.chips} xscroll`} role="tablist" aria-label="Tipo de celular">
              {GUIDE_ORDER.map(id => (
                <button key={id} type="button" role="tab" aria-selected={id === guideId} className={`${g.chip} ${id === guideId ? g.chipOn : ''}`}
                  onClick={() => { setGuideId(id); setManual(false) }}>{GUIDES[id].chip}</button>
              ))}
            </div>
          </div>

          <div className={g.guideTitle}>{guide.heading}</div>
          <div className={g.steps}>
            {steps.map((s, i) => (
              <StepCard key={guideId + (oneTap ? 'tap' : '') + i} step={s} i={i} n={steps.length} cardRef={i === 0 ? firstStep : undefined}>
                {oneTap && i === 0 && (
                  <>
                    <button type="button" className={x.cta} disabled={busy} onClick={install}>⬇ Instalar la app</button>
                    <button type="button" className={g.link} onClick={() => setManual(true)}>¿No funciona? Ver los pasos con el menú de Chrome</button>
                  </>
                )}
              </StepCard>
            ))}
            {guideId === 'inapp' && (
              <section className={g.step}>
                <div className={g.stepTitle}>¿No encuentras la opción?</div>
                <p className={g.stepText}>Copia el enlace y pégalo en Safari (iPhone) o Chrome (Android).</p>
                <button type="button" className={x.cta} style={{ background: 'var(--ink)', height: 50, fontSize: 15 }} onClick={copy}>{copied ? '¡Enlace copiado!' : 'Copiar el enlace'}</button>
              </section>
            )}
            {guide.tip && !oneTap && (
              <details className={g.tip}>
                <summary>{guide.tip.title}</summary>
                {guide.tip.steps.map((s, i) => <StepCard key={i} step={s} i={i} n={guide.tip!.steps.length} />)}
              </details>
            )}
          </div>

          <div className={g.faq}>
            <div><b>¿Es seguro? ¿Pide permisos?</b> Es seguro y no pide permisos especiales: no necesita App Store ni Play Store, ni tu contraseña, y casi no ocupa espacio. Solo en algunos Android (Xiaomi, Redmi, POCO, Huawei) hay que dejar que Chrome cree accesos directos.</div>
            <div><b>¿Te quedaste en algún paso?</b> <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', fontWeight: 700 }}>Escríbenos por WhatsApp</a> y te ayudamos.</div>
          </div>

          <button type="button" className={x.skip} onClick={() => nav('/')}>Seguir sin instalar →</button>
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
