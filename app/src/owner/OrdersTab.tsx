import { useEffect, useState } from 'react'
import { dateTime, fmt, orderId } from '../domain/format.ts'
import { discountName } from '../domain/loyalty.ts'
import { advanceLabel, BAR_COLORS, canReject, hasUnread, isFinished, isOtherZoneOrder, MAX_DELIVERY_FEE, originLabel, OWNER_BADGE, ownerAmounts, splitAddressNotes, STAGE, STAGE_MAX, ordersInPeriod, type OrderPeriod } from '../domain/orders.ts'
import type { Order } from '../domain/types.ts'
import { useSnapshot, useStore } from '../data/hooks.ts'
import { UnreadDot } from '../ui/ui.tsx'
import { downloadBlob } from './download.ts'
import { buildReport } from './report.ts'
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

/** WhatsApp wants the country code: Colombian mobiles are 10 digits starting with 3. */
const waNumber = (digits: string) => (digits.length === 10 && digits.startsWith('3') ? '57' + digits : digits)
// only the street address (plus the city): building, apartment and notes confuse the search
const mapsUrl = (address: string) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address + ', Envigado, Antioquia')

function OrderCard({ ord, open, onToggle, onChat }: { ord: Order; open: boolean; onToggle: () => void; onChat: () => void }) {
  const store = useStore()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [fee, setFee] = useState('')
  const st = OWNER_BADGE[ord.status]
  const n = STAGE[ord.status]
  const done = isFinished(ord.status)
  const faded = done || ord.status === 'rechazado'
  const adv = advanceLabel(ord)
  const run = (p: Promise<void>) => p.then(() => setErr(''), e => setErr(e instanceof Error ? e.message : 'No se pudo actualizar.'))
  const dom = ord.origin === 'domicilio'
  // barrio "Otro": the owner sets (or corrects) the delivery price until the order goes out
  const otherZone = isOtherZoneOrder(ord)
  const fees = useSnapshot().settings.deliveryFees
  const amounts = ownerAmounts(ord, fees)
  const extra = splitAddressNotes(ord.addressNotes)
  const phoneDigits = (ord.phone ?? '').replace(/\D/g, '')
  const saveFee = (v: number) => run(store.updateSettings(st => ({ deliveryFees: { ...st.deliveryFees, [String(ord.num)]: v } })).then(() => setFee('')))

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
          <div className={o.sec}>
            <div className={o.secHead}>{dom ? '🛵 Entrega a domicilio' : '🏠 Recoge en el local'}</div>
            {dom ? (
              <>
                <div className={o.addr}>{ord.address}</div>
                {ord.zoneLabel && <span className={o.chip}>Barrio: {ord.zoneLabel}{otherZone ? ' (otro)' : ''}</span>}
                {extra.apt && <div className={o.note}><b>Edificio / Apto / Torre:</b> {extra.apt}</div>}
                {extra.notes && <div className={o.note}><b>Indicaciones:</b> {extra.notes}</div>}
              </>
            ) : <div className={o.addr}>El cliente pasa a recogerlo</div>}
            {(phoneDigits || dom) && (
              <div className={o.linkRow}>
                {phoneDigits && <a className={o.pill} href={`tel:${phoneDigits}`}>📞 Llamar</a>}
                {phoneDigits && <a className={o.pill} href={`https://wa.me/${waNumber(phoneDigits)}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>}
                {dom && <a className={o.pill} href={mapsUrl(ord.address)} target="_blank" rel="noopener noreferrer">🗺️ Mapa</a>}
              </div>
            )}
          </div>

          <div className={o.sec}>
            <div className={o.secHead}>👤 Cliente</div>
            <div className={o.kv}><span>Nombre</span><b>{ord.name}</b></div>
            <div className={o.kv}><span>Celular</span><b>{ord.phone && ord.phone !== '—' ? ord.phone : 'No dejó'}</b></div>
            {ord.email && <div className={o.kv}><span>Correo</span><b style={{ fontWeight: 500 }}>{ord.email}</b></div>}
          </div>

          <div className={o.sec}>
            <div className={o.secHead}>🍽️ Pedido</div>
            {(ord.itemsList.length ? ord.itemsList : [ord.items]).map((l, i) => {
              // lines[] follows the cart order, like itemsList: price of each dish (qty × unit)
              const ln = ord.itemsList.length === ord.lines.length ? ord.lines[i] : undefined
              return (
                <div key={i} className={o.itemRow}>
                  <div className={o.item}>{l}</div>
                  {ln && <b className={o.itemPrice}>{fmt(ln.qty * ln.unit)}</b>}
                </div>
              )
            })}
          </div>

          <div className={o.sec}>
            <div className={o.secHead}>💵 Pago</div>
            <div className={o.kv}><span>Forma de pago</span><b>{ord.pay}</b></div>
            <div className={o.kv}><span>Platos</span><b>{fmt(ord.subtotal)}</b></div>
            {ord.discount > 0 && <div className={o.kv}><span>{discountName(ord.discountKind)}</span><b style={{ color: '#8FD09E' }}>−{fmt(ord.discount)}</b></div>}
            {dom && <div className={o.kv}><span>Domicilio{otherZone ? ' (lo paga al recibir)' : ''}</span><b>{amounts.delivery === null ? 'Por definir' : fmt(amounts.delivery)}</b></div>}
            <div className={o.kv} style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 7, marginTop: 2 }}><span style={{ color: '#fff', fontWeight: 600 }}>Total</span><b style={{ fontSize: 15 }}>{fmt(amounts.total)}</b></div>
          </div>

          {(ord.reviewStars || ord.reviewComment) && (
            <div className={o.sec}>
              <div className={o.secHead}>⭐ Calificación</div>
              {ord.reviewStars ? <div style={{ color: '#E0A83B', fontSize: 16 }}>{'★'.repeat(ord.reviewStars)}<span style={{ color: '#4a453c' }}>{'★'.repeat(5 - ord.reviewStars)}</span></div> : null}
              {ord.reviewComment ? <div style={{ fontSize: 13, color: '#e7ddce' }}>“{ord.reviewComment}”</div> : null}
            </div>
          )}
        </div>
      )}

      <div className={o.actions}>
        <div className={o.total}>{fmt(amounts.total)}{otherZone && amounts.delivery === null && <span style={{ fontSize: 11, color: '#F6C88B', display: 'block' }}>+ domicilio</span>}</div>
        <div className={o.btnRow}>
          <button type="button" className={o.chatBtn} onClick={onChat}>💬 Chat{hasUnread(ord, 'dueno') && <UnreadDot size={12} top={-5} right={-5} ring="#201C18" />}</button>
          {canReject(ord.status) && <button type="button" className={o.rejectBtn} aria-label={`Rechazar ${orderId(ord.num)}`} onClick={() => { setRejecting(true); setReason('') }}>✕</button>}
          {adv && <button type="button" className={o.advance} onClick={() => run(store.advanceOrder(ord.num))}>{adv}</button>}
          {done && <span style={{ fontSize: 12, color: '#7d9c86', fontWeight: 600 }}>✓ Entregado</span>}
        </div>
      </div>
      {otherZone && !faded && (
        <form className={o.rejectBox} style={{ borderColor: 'rgba(246,200,139,.35)' }}
          onSubmit={e => { e.preventDefault(); const v = Number(fee.replace(/\D/g, '')); if (fee.trim() && v <= MAX_DELIVERY_FEE) saveFee(v) }}>
          <div style={{ fontSize: 12, color: '#F6C88B', fontWeight: 600, marginBottom: 8 }}>
            {amounts.delivery === null
              ? <>Barrio “Otro”: {ord.zoneLabel}. Elige el precio del domicilio</>
              : <>Barrio “Otro”: {ord.zoneLabel}. Domicilio: {fmt(amounts.delivery)} · puedes cambiarlo</>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className={o.darkInput} style={{ flex: 1, fontSize: 12.5, padding: '10px 12px', borderRadius: 10 }} value={fee} onChange={e => setFee(e.target.value)}
              placeholder={amounts.delivery === null ? 'Ej: 8000' : String(amounts.delivery)} inputMode="numeric" aria-label={`Valor del domicilio ${orderId(ord.num)}`} maxLength={9} />
            <button type="submit" className={o.redBtn} style={{ padding: '9px 16px', borderRadius: 10, fontSize: 12.5 }}>Guardar</button>
          </div>
          <div style={{ fontSize: 11, color: '#a89d8c', marginTop: 7 }}>Solo para tu total y el reporte: el cliente lo paga al recibir y no ve este valor.</div>
        </form>
      )}
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

const PERIODS: { id: OrderPeriod; label: string }[] = [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Esta semana' }, { id: 'todos', label: 'Todos' }]

export function OrdersTab({ onChat }: { onChat: (num: number) => void }) {
  const all = useSnapshot().orders
  const [openNum, setOpenNum] = useState<number | null>(null)
  const [period, setPeriod] = useState<OrderPeriod>('hoy')
  const orders = ordersInPeriod(all, period)
  return (
    <>
      <ReportCard />
      <div className={o.chipsWrap} role="tablist" aria-label="Mostrar pedidos de" style={{ marginBottom: 12 }}>
        {PERIODS.map(p => {
          const n = ordersInPeriod(all, p.id).length
          return (
            <button key={p.id} type="button" role="tab" aria-selected={period === p.id} className={`${o.dayChip} ${period === p.id ? o.dayChipOn : ''}`}
              onClick={() => setPeriod(p.id)}>{p.label} ({n})</button>
          )
        })}
      </div>
      <div className={o.list}>
        {orders.length === 0 && <div style={{ fontSize: 12.5, color: '#8b8070', textAlign: 'center', padding: '24px 0' }}>
          {all.length === 0 ? 'Todavía no hay pedidos. Los nuevos aparecen aquí al instante.' : period === 'hoy' ? 'Hoy todavía no hay pedidos. Los nuevos aparecen aquí al instante.' : 'No hay pedidos esta semana.'}
        </div>}
        {orders.map(ord => (
          <OrderCard key={ord.num} ord={ord} open={openNum === ord.num} onToggle={() => setOpenNum(v => (v === ord.num ? null : ord.num))} onChat={() => onChat(ord.num)} />
        ))}
      </div>
    </>
  )
}
