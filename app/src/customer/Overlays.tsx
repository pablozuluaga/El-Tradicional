import { useState } from 'react'
import { ONBOARDING } from '../domain/catalog.ts'
import { EMAIL_RE } from '../domain/format.ts'
import { useDevice } from '../data/hooks.ts'
import { Tono } from '../ui/Tono.tsx'
import o from './overlays.module.css'

/** First launch: Toño asks for name + email once; they are locked afterwards. */
export function NameGate() {
  const [, setDev] = useDevice()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const ok = !!first.trim() && EMAIL_RE.test(email.trim())
  const submit = () => { if (ok) setDev({ firstName: first.trim(), lastName: last.trim(), email: email.trim(), gateDone: true }) }

  return (
    <div className={o.backdrop} style={{ zIndex: 70, background: 'rgba(20,17,14,.72)' }} role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className={o.sheet} onSubmit={e => { e.preventDefault(); submit() }}>
        <div className={o.row}>
          <div className="bob" style={{ flex: 'none', width: 76, height: 88, animationDuration: '2.4s' }}><Tono variant="gate" width={76} height={88} /></div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div className={o.title} id="gate-title">¡Bienvenido a El Tradicional!</div>
            <div className={o.body}>Soy Toño, tu guía en la app. Para comenzar, cuéntame tu nombre y correo. Así los pedidos quedan a tu nombre y podemos enviarte descuentos y novedades.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <input className={o.input} value={first} onChange={e => setFirst(e.target.value)} placeholder="Nombre" aria-label="Nombre" autoComplete="given-name" maxLength={60} />
          <input className={o.input} value={last} onChange={e => setLast(e.target.value)} placeholder="Apellidos" aria-label="Apellidos" autoComplete="family-name" maxLength={80} />
        </div>
        <input className={o.input} style={{ marginTop: 10 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" aria-label="Correo electrónico" autoComplete="email" maxLength={120} />
        {ok && <button type="submit" className={o.submit}>¡Listo, sigamos!</button>}
        <div className={o.hint}>Escribe tu nombre y correo para continuar</div>
      </form>
    </div>
  )
}

export function Tour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const cur = ONBOARDING[step]
  const last = step === ONBOARDING.length - 1
  return (
    <div className={o.backdrop} style={{ zIndex: 60, background: 'rgba(20,17,14,.62)' }} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className={o.sheet} style={{ paddingTop: 22, paddingBottom: 'max(26px, var(--safe-bottom))' }}>
        <div className={o.row}>
          <div className="bob" style={{ flex: 'none', width: 84, height: 98, animationDuration: '2.4s' }}><Tono variant="tour" width={84} height={98} /></div>
          <div style={{ flex: 1, paddingTop: 6 }} aria-live="polite">
            <div className={o.title} id="tour-title">{cur.t}</div>
            <div className={o.body}>{cur.b}</div>
          </div>
        </div>
        <div className={o.dots}>{ONBOARDING.map((_, i) => <span key={i} className={`${o.dot} ${i === step ? o.dotOn : ''}`} />)}</div>
        <div className={o.actions}>
          <button type="button" className={o.skip} onClick={onDone}>Saltar</button>
          <button type="button" className={o.next} onClick={() => (last ? onDone() : setStep(step + 1))}>{last ? '¡Listo, a pedir!' : 'Siguiente'}</button>
        </div>
      </div>
    </div>
  )
}

export function HelperButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={o.helper} onClick={onClick} title="Ayuda de Toño" aria-label="Ayuda de Toño">
      <div className="bob" style={{ width: 40, height: 46, animationDuration: '2.4s' }}><Tono variant="helper" width={40} height={46} /></div>
    </button>
  )
}
