import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { orderId } from '../../domain/format.ts'
import { useSnapshot, useStore } from '../../data/hooks.ts'
import { BackButton } from '../../ui/ui.tsx'
import { P } from '../paths.ts'

export function Chat() {
  const nav = useNavigate()
  const store = useStore()
  const snap = useSnapshot()
  const num = Number(useParams().num)
  const order = snap.orders.find(o => o.num === num)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const count = order?.chat.length ?? 0

  useEffect(() => {
    if (!order) return
    void store.markSeen(order.num)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count, order, store])

  if (!order) return snap.ready ? <Navigate to={P.orders} replace /> : null

  const send = () => {
    const t = draft.trim()
    if (!t) return
    setDraft('')
    void store.sendMessage(order.num, t)
  }

  return (
    <>
      <div style={{ flex: 'none', padding: '16px 22px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <BackButton onClick={() => nav(P.orders)} />
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1 }}>El Tradicional</div>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Chat · {orderId(order.num)}</div>
        </div>
      </div>
      <div className="noscroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--cream)' }} aria-live="polite">
        {order.chat.map(m => m.from === 'cliente'
          ? <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--red)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 13px', fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{m.text}</div>
          : <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '80%', background: '#fff', border: '1px solid var(--line)', borderRadius: '14px 14px 14px 4px', padding: '10px 13px', fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{m.text}</div>)}
        <div ref={endRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send() }}
        style={{ flex: 'none', borderTop: '1px solid var(--line)', padding: '12px 16px max(20px, var(--safe-bottom))', background: '#fff', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escribe un mensaje…" aria-label="Mensaje" maxLength={1000}
          style={{ flex: 1, minWidth: 0, border: '1px solid var(--line-3)', borderRadius: 999, padding: '12px 16px', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }} />
        <button type="submit" aria-label="Enviar" style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', border: 'none', background: 'var(--red)', color: '#fff', cursor: 'pointer', fontSize: 17 }}>➤</button>
      </form>
    </>
  )
}
