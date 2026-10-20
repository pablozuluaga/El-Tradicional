import { useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { Step } from '../customer/install/guides.tsx'
import { REELS } from './flows.tsx'

/*
 * A short vertical video (1080×1920) of the install guide of one phone, drawn from the same scenes
 * as the install page. The recorder (scripts/reel.mjs) calls window.__frame(ms) for every frame.
 */

type Seg = { kind: 'intro' } | { kind: 'step'; step: Step; n: number; of: number } | { kind: 'done'; step: Step } | { kind: 'tip'; step: Step } | { kind: 'end' }

const LEN = { intro: 2200, step: 3400, done: 3000, tip: 4200, end: 1700 }
const IN = 420 // entrance of each part

const params = new URLSearchParams(location.search)
const reel = REELS[params.get('video') ?? 'iphone-ios26']
const who = reel.name

function timeline(): Seg[] {
  return [
    { kind: 'intro' },
    ...reel.steps.map((step, i) => ({ kind: 'step' as const, step, n: i + 1, of: reel.steps.length })),
    { kind: 'done', step: reel.done },
    ...(reel.tip ? [{ kind: 'tip' as const, step: reel.tip }] : []),
    { kind: 'end' },
  ]
}
const SEGS = timeline()
const lenOf = (s: Seg) => LEN[s.kind]
const DURATION = SEGS.reduce((t, s) => t + lenOf(s), 0)

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)

function at(t: number) {
  let start = 0
  for (const s of SEGS) {
    if (t < start + lenOf(s)) return { seg: s, local: t - start }
    start += lenOf(s)
  }
  return { seg: SEGS[SEGS.length - 1], local: lenOf(SEGS[SEGS.length - 1]) }
}

const shell: React.CSSProperties = {
  width: 1080, height: 1920, overflow: 'hidden', position: 'relative', fontFamily: "'Geist', system-ui, sans-serif",
  background: 'radial-gradient(circle at 85% 8%, rgba(245,165,36,.35) 0 180px, transparent 181px), linear-gradient(170deg, #D21C22, #C8161D 45%, #9E0F14)',
  color: '#fff',
}

function Header() {
  return (
    <div style={{ position: 'absolute', top: 70, left: 70, right: 70, display: 'flex', alignItems: 'center', gap: 26 }}>
      <img src="/assets/logo.jpeg" alt="" style={{ width: 120, height: 120, borderRadius: '50%', border: '6px solid #fff', objectFit: 'cover' }} />
      <div>
        <div style={{ fontSize: 30, letterSpacing: '.14em', fontWeight: 700, color: '#FFD9C7' }}>CÓMO INSTALAR LA APP</div>
        <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>{who}</div>
      </div>
    </div>
  )
}

function Caption({ kicker, title, k }: { kicker?: string; title: string; k: number }) {
  return (
    <div style={{ position: 'absolute', top: 250, left: 60, right: 60, background: '#fff', color: '#14110E', borderRadius: 40, padding: '30px 40px 34px',
      boxShadow: '0 30px 60px -30px rgba(0,0,0,.55)', opacity: ease(k), transform: `translateY(${(1 - ease(k)) * 30}px)` }}>
      {kicker && <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '.1em', color: '#C8161D', marginBottom: 8 }}>{kicker}</div>}
      <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.12 }}>{title}</div>
    </div>
  )
}

function PhoneScene({ scene, k }: { scene: ReactNode; k: number }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center',
      opacity: ease(k), transform: `translateX(${(1 - ease(k)) * 120}px) scale(${0.96 + 0.04 * ease(k)})` }}>
      <div className="reel-phone" style={{ width: 620 }}>{scene}</div>
    </div>
  )
}

function Dots({ n, of }: { n: number; of: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18 }}>
      {Array.from({ length: of + 1 }, (_, i) => (
        <span key={i} style={{ width: i + 1 === n ? 64 : 22, height: 22, borderRadius: 11, background: i + 1 <= n ? '#fff' : 'rgba(255,255,255,.35)' }} />
      ))}
    </div>
  )
}

function Frame({ t }: { t: number }) {
  const { seg, local } = at(t)
  const k = local / IN
  const actions = SEGS.filter(s => s.kind === 'step').length
  if (seg.kind === 'intro' || seg.kind === 'end') {
    const intro = seg.kind === 'intro'
    return (
      <div style={shell}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: 80, textAlign: 'center',
          opacity: ease(k), transform: `scale(${0.94 + 0.06 * ease(k)})` }}>
          <img src="/assets/logo.jpeg" alt="" style={{ width: 300, height: 300, borderRadius: '50%', border: '12px solid #fff', objectFit: 'cover', boxShadow: '0 40px 80px -30px rgba(0,0,0,.6)' }} />
          {intro ? (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 110, lineHeight: 1 }}>Instala la app de<br />El Tradicional</div>
              <div style={{ background: '#fff', color: '#C8161D', borderRadius: 999, padding: '18px 44px', fontSize: 48, fontWeight: 800 }}>{who}</div>
              <div style={{ fontSize: 44, color: '#FFE3D6', fontWeight: 600 }}>{actions === 1 ? '1 paso' : actions + ' pasos'} · gratis · sin tienda de apps</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 104, lineHeight: 1.02 }}>¡Pide tu almuerzo<br />desde la app!</div>
              <div style={{ fontSize: 46, color: '#FFE3D6', fontWeight: 600 }}>el-tradicional.vercel.app</div>
            </>
          )}
        </div>
      </div>
    )
  }
  const kicker = seg.kind === 'step' ? `PASO ${seg.n} DE ${seg.of}` : seg.kind === 'tip' ? '¿NO APARECE EL ÍCONO?' : undefined
  const title = seg.kind === 'tip' ? 'Dale permiso a Chrome: Otros permisos → Accesos directos → Permitir' : seg.step.title
  return (
    <div style={shell}>
      <Header />
      <Caption kicker={kicker} title={title} k={k} />
      <PhoneScene scene={seg.step.scene} k={k} />
      {seg.kind === 'step' && <Dots n={seg.n} of={seg.of} />}
    </div>
  )
}

export function Reel() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const w = window as unknown as { __frame: (ms: number) => void; __duration: number }
    w.__frame = ms => {
      flushSync(() => setT(ms))
      // the scenes' pulsing rings are CSS animations: put them at this exact moment too
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms }
    }
    w.__duration = DURATION
  }, [])
  return (
    <>
      <style>{'.reel-phone svg { max-width: none !important; width: 100% !important; filter: drop-shadow(0 40px 50px rgba(0,0,0,.45)) !important; }'}</style>
      <Frame t={t} />
    </>
  )
}
