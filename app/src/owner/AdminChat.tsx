import { useEffect, useRef, useState } from 'react'
import { QUICK_REPLIES } from '../domain/catalog.ts'
import { orderId } from '../domain/format.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { BackButton } from '../ui/ui.tsx'
import o from './o.module.css'

export function AdminChat({ num, onClose }: { num: number; onClose: () => void }) {
  const store = useStore()
  const order = useSnapshot().orders.find(x => x.num === num)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const count = order?.chat.length ?? 0

  useEffect(() => {
    if (!order) return
    void store.markSeen(order.num)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [count, order, store])

  if (!order) return null
  const send = (t: string) => { const v = t.trim(); if (v) void store.sendMessage(num, v) }

  return (
    <div className={o.chat} role="dialog" aria-label={`Chat con ${order.name}`}>
      <div className={o.chatHead}>
        <BackButton dark onClick={onClose} />
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1 }}>{order.name} · {orderId(order.num)}</div>
          <div style={{ fontSize: 11, color: '#8FD09E', fontWeight: 600 }}>Chat en vivo con el cliente</div>
        </div>
      </div>
      <div className="noscroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
        {order.chat.map(m => <div key={m.id} className={m.from === 'cliente' ? o.bubbleThem : o.bubbleMe}>{m.text}</div>)}
        <div ref={endRef} />
      </div>
      <div style={{ flex: 'none', borderTop: '1px solid rgba(255,255,255,.1)', padding: '10px 14px 4px' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8b8070', fontWeight: 600, marginBottom: 8 }}>Respuestas rápidas</div>
        <div className="xscroll" style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
          {QUICK_REPLIES.map(q => <button key={q} type="button" className={o.quick} onClick={() => send(q)}>{q}</button>)}
        </div>
      </div>
      <form style={{ flex: 'none', padding: '6px 14px max(20px, var(--safe-bottom))', display: 'flex', gap: 8, alignItems: 'center' }}
        onSubmit={e => { e.preventDefault(); send(draft); setDraft('') }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escribe una respuesta…" aria-label="Respuesta" maxLength={1000}
          style={{ flex: 1, minWidth: 0, border: '1px solid rgba(255,255,255,.16)', background: 'var(--ink-2)', color: '#fff', borderRadius: 999, padding: '12px 16px', fontSize: 13.5, outline: 'none' }} />
        <button type="submit" className={o.send} aria-label="Enviar">➤</button>
      </form>
    </div>
  )
}
