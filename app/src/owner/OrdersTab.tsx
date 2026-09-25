import { useEffect, useState } from 'react'
import { dateTime, fmt, orderId } from '../domain/format.ts'
import { discountName } from '../domain/loyalty.ts'
import { advanceLabel, BAR_COLORS, canReject, hasUnread, originLabel, OWNER_BADGE, STAGE, STAGE_MAX } from '../domain/orders.ts'
import type { Order } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { UnreadDot } from '../ui/ui.tsx'
import { buildReport, downloadBlob } from './report.ts'
import o from './o.module.css'

function ReportCard() {
  const store = useStore()
  const snap = useSnapshot()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => { store.reportCount(from, to).then(n => { if (alive) setCount(n) }, () => {}) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [store, from, to, snap.orders])

  const download = async () => {
    try {
      const rows = await store.reportRows(from, to)
      if (!rows.length) { setMsg('No hay pedidos en ese rango de fechas.'); return }
      setMsg('Generando el reporte…')
      const { blob, name } = await buildReport(rows, from, to)
      downloadBlob(blob, name)
      setMsg('Listo: ' + name + ' · ' + rows.length + ' pedidos.')
    } catch {
      setMsg('No se pudo generar el archivo. Revisa la conexión e intenta de nuevo.')
    }
  }

  return (
    <div className={o.panel}>
      <div className={o.panelHead}>Reporte para facturación</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <label style={{ flex: 1 }}><div className={o.small}>Desde</div><input type="date" className={o.dateInput} value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); setMsg('') }} /></label>
        <label style={{ flex: 1 }}><div className={o.small}>Hasta</div><input type="date" className={o.dateInput} value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setMsg('') }} /></label>
      </div>
      <button type="button" className={o.greenBtn} onClick={download}>⬇ Descargar reporte en Excel (.xlsx)</button>
      <div className={o.hint}>
        Archivo con formato profesional: pedidos, cliente, detalle, pago, totales y resumen del periodo.
        {count !== null && <> {count} {count === 1 ? 'pedido en el rango' : 'pedidos en el rango'}.</>}
      </div>
      {msg && <div className={o.msg} role="status">{msg}</div>}
    </div>
  )
}

function OrderCard({ ord, open, onToggle, onChat }: { ord: Order; open: boolean; onToggle: () => void; onChat: () => void }) {
  const store = useStore()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const st = OWNER_BADGE[ord.status]
  const n = STAGE[ord.status]
  const done = ord.status === 'listo'
  const faded = done || ord.status === 'rechazado'
  const adv = advanceLabel(ord)
  const run = (p: Promise<void>) => p.then(() => setErr(''), e => setErr(e instanceof Error ? e.message : 'No se pudo actualizar.'))
  const dom = ord.origin === 'domicilio'

  return (
    <div className={o.card} style={{ background: faded ? '#332e26' : '#201C18', borderColor: faded ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)', opacity: faded ? 0.6 : 1 }}>
      <div className={o.cardTop} onClick={onToggle} role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}>
        <div className={o.cardWho}>
          <span className={o.chev}>{open ? '⌄' : '›'}</span>
          <div style={{ minWidth: 0 }}>
            <div className={o.cardTitle} style={{ color: faded ? '#9a8f7d' : '#fff' }}>{orderId(ord.num)} · {ord.name}</div>
            {ord.email && <div className={o.cardEmail}>{ord.email}</div>}
            <div className={o.cardMeta}>{dateTime(ord.createdAt)} · {originLabel(ord.origin)}{ord.rated ? ' · ⭐ Calificado' : ''}</div>
          </div>
        </div>
        <div className={o.badge} style={{ background: st.bg, color: st.fg }}>{st.label}</div>
      </div>
      <div className={o.bar}><div className={o.barFill} style={{ width: Math.round((n / STAGE_MAX) * 100) + '%', background: done ? '#7d9c86' : BAR_COLORS[n] }} /></div>

      {open && (
        <div className={o.detail}>
          <div className={o.dLabel}>Cliente</div>
          <div className={o.dText}>{ord.name} · {ord.phone || '—'}</div>
          {ord.email && <div style={{ fontSize: 12, color: '#a89d8c' }}>{ord.email}</div>}
          <div className={o.dLabel} style={{ marginTop: 4 }}>{originLabel(ord.origin)}</div>
          <div className={o.dText}>{dom ? [ord.address, ord.zoneLabel].filter(Boolean).join(' · ') : ord.address}</div>
          {ord.addressNotes && <div style={{ fontSize: 12, color: '#c9bfae' }}>Indicaciones: {ord.addressNotes}</div>}
          <div className={o.dLabel} style={{ marginTop: 4 }}>Detalle</div>
          {(ord.itemsList.length ? ord.itemsList : [ord.items]).map((l, i) => <div key={i} className={o.dText} style={{ color: '#e7ddce' }}>• {l}</div>)}
          <div className={o.dRow} style={{ marginTop: 6 }}><span style={{ color: '#8b8070' }}>Pago</span><span style={{ textAlign: 'right' }}>{ord.pay}</span></div>
          {ord.discount > 0 && <div className={o.dRow}><span style={{ color: '#8b8070' }}>{discountName(ord.discountKind)}</span><span>−{fmt(ord.discount)}</span></div>}
          {dom && <div className={o.dRow}><span style={{ color: '#8b8070' }}>Domicilio</span><span>{fmt(ord.delivery)}</span></div>}
          {(ord.reviewStars || ord.reviewComment) && (
            <div className={o.dRow}><span style={{ color: '#8b8070' }}>Calificación</span>
              <span style={{ textAlign: 'right' }}>{ord.reviewStars ? <span style={{ color: '#E0A83B' }}>{'★'.repeat(ord.reviewStars)}<span style={{ color: '#4a453c' }}>{'★'.repeat(5 - ord.reviewStars)}</span></span> : null}{ord.reviewComment ? <div style={{ fontSize: 12, color: '#c9bfae' }}>“{ord.reviewComment}”</div> : null}</span>
            </div>
          )}
        </div>
      )}

      <div className={o.actions}>
        <div className={o.total}>{fmt(ord.total)}</div>
        <div className={o.btnRow}>
          <button type="button" className={o.chatBtn} onClick={onChat}>💬 Chat{hasUnread(ord, 'dueno') && <UnreadDot size={12} top={-5} right={-5} ring="#201C18" />}</button>
          {canReject(ord.status) && <button type="button" className={o.rejectBtn} aria-label={`Rechazar ${orderId(ord.num)}`} onClick={() => { setRejecting(true); setReason('') }}>✕</button>}
          {adv && <button type="button" className={o.advance} onClick={() => run(store.advanceOrder(ord.num))}>{adv}</button>}
          {done && <span style={{ fontSize: 12, color: '#7d9c86', fontWeight: 600 }}>✓ Entregado</span>}
        </div>
      </div>
      {rejecting && canReject(ord.status) && (
        <div className={o.rejectBox}>
          <div style={{ fontSize: 12, color: '#F0A0A0', fontWeight: 600, marginBottom: 8 }}>¿Por qué se rechaza?</div>
          <input className={o.darkInput} style={{ fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 9 }} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Ej: se agotó el sancocho / fuera de zona" aria-label="Motivo del rechazo" maxLength={200} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={o.ghostBtn} onClick={() => setRejecting(false)}>Cancelar</button>
            <button type="button" className={o.redBtn} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12.5 }} onClick={() => run(store.rejectOrder(ord.num, reason).then(() => setRejecting(false)))}>Rechazar pedido</button>
          </div>
        </div>
      )}
      {ord.status === 'rechazado' && <div style={{ marginTop: 10, fontSize: 12, color: '#F0A0A0' }}>Rechazado · {ord.rejectReason}</div>}
      {err && <div style={{ marginTop: 8, fontSize: 12, color: '#F0A0A0' }} role="alert">{err}</div>}
    </div>
  )
}

export function OrdersTab({ onChat }: { onChat: (num: number) => void }) {
  const orders = useSnapshot().orders
  const [openNum, setOpenNum] = useState<number | null>(null)
  return (
    <>
      <ReportCard />
      <div className={o.list}>
        {orders.length === 0 && <div style={{ fontSize: 12.5, color: '#8b8070', textAlign: 'center', padding: '24px 0' }}>Todavía no hay pedidos. Los nuevos aparecen aquí al instante.</div>}
        {orders.map(ord => (
          <OrderCard key={ord.num} ord={ord} open={openNum === ord.num} onToggle={() => setOpenNum(v => (v === ord.num ? null : ord.num))} onChat={() => onChat(ord.num)} />
        ))}
      </div>
    </>
  )
}
