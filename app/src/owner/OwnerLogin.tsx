import { useState } from 'react'
import { useSnapshot, useStore } from '../data/hooks.ts'
import o from './o.module.css'

/** Supabase mode only: the owner signs in with the account listed in `public.owners`. */
export function OwnerLogin() {
  const store = useStore()
  const snap = useSnapshot()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true); setErr('')
    try { await store.signIn(email.trim(), password) } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo iniciar sesión.') } finally { setBusy(false) }
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px' }}>
      <img src="/assets/logo.jpeg" alt="El Tradicional" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px' }} />
      <div className={o.kicker} style={{ textAlign: 'center' }}>Panel del dueño</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, textAlign: 'center', marginBottom: 20 }}>El Tradicional</div>
      <form onSubmit={e => { e.preventDefault(); void submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input className={o.darkInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo" aria-label="Correo" autoComplete="username" />
        <input className={o.darkInput} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" aria-label="Contraseña" autoComplete="current-password" />
        <button type="submit" className={o.redBtn} disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
        {(err || snap.error) && <div style={{ fontSize: 12, color: '#F0A0A0', textAlign: 'center' }} role="alert">{err || snap.error}</div>}
      </form>
    </div>
  )
}
