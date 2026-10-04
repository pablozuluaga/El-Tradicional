import { useState } from 'react'
import { newId } from '../../domain/ids.ts'
import { useNavigate } from 'react-router-dom'
import { OTHER_ZONE_ID, PAYS } from '../../domain/catalog.ts'
import { discountName, LOYALTY_RATE } from '../../domain/loyalty.ts'
import { fmt, orderId } from '../../domain/format.ts'
import { rememberCart } from '../editOrder.ts'
import { itemsDetail, itemsSummary, orderLines } from '../../domain/orders.ts'
import { isPhone } from '../../domain/placement.ts'
import { deliveryFee, discountFor, isOtherZone, orderTotal, subtotal, zoneById, zonesOf } from '../../domain/pricing.ts'
import type { OrderDraft } from '../../domain/types.ts'
import type { Address } from '../../data/device.ts'
import { useDevice, useSnapshot, useStore } from '../../data/hooks.ts'
import { BackButton } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import k from './Checkout.module.css'

export function Checkout() {
  const nav = useNavigate()
  const store = useStore()
  const snap = useSnapshot()
  const [dev, setDev] = useDevice()
  const [fLine, setLine] = useState('')
  const [fApt, setApt] = useState('')
  const [fNotes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const dom = dev.mode === 'domicilio'
  const other = isOtherZone(dev.mode, dev.zone || null)
  const otherName = dev.zoneOther.trim()
  // "Otro" isn't in ZONES: the customer types the barrio and the owner sets the fee on the order
  const zones = zonesOf(snap.settings)
  const zone = other ? { id: OTHER_ZONE_ID, label: otherName, fee: 0 } : zoneById(dev.zone, zones)
  const sub = subtotal(dev.cart, dev.mode)
  // editing an order keeps the benefit it was placed with
  const editing = dev.editingOrder !== null ? snap.orders.find(o => o.num === dev.editingOrder) ?? null : null
  const discKind = editing ? editing.discountKind : snap.eligibility.kind
  const discount = discountFor(sub, editing ? (editing.discountKind ? LOYALTY_RATE : 0) : snap.eligibility.rate)
  const fee = deliveryFee(dev.mode, dev.zone || null, zones)
  const total = orderTotal(sub, discount, fee)
  const saved = dev.addresses.find(a => a.id === dev.selectedAddr) ?? null
  const formOpen = dev.selectedAddr === 'new' || dev.addresses.length === 0 || !saved

  const saveAddr = (): Address | null => {
    const line = fLine.trim()
    if (!line) return null
    const a: Address = { id: newId('a'), line, apt: fApt.trim(), notes: fNotes.trim() }
    setDev(st => ({ addresses: [...st.addresses, a], selectedAddr: a.id }))
    setLine(''); setApt(''); setNotes('')
    return a
  }

  const place = async () => {
    setError('')
    if (!dev.cart.length) { nav(P.cart); return }
    if (!snap.settings.storeOpen) { setError('La cocina está cerrada en este momento. Atendemos 11:30am – 4pm.'); return }
    let addr = saved
    if (dom) {
      if (!zone) { setError('Selecciona tu barrio.'); return }
      if (other && !otherName) { setError('Escribe el nombre de tu barrio.'); return }
      addr = formOpen ? saveAddr() : saved
      if (!addr) { setError('Escribe la dirección de entrega.'); return }
    }
    if (!isPhone(dev.phone)) { setError('Escribe tu número de celular.'); return }
    const customerId = store.customerId()
    if (!customerId) { setError('No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.'); return }
    const draft: OrderDraft = {
      customerId,
      name: (dev.firstName.trim() + ' ' + dev.lastName.trim()).trim() || 'Cliente app',
      email: dev.email.trim(),
      phone: dev.phone.trim(),
      origin: dev.mode,
      zoneId: dom ? zone!.id : null,
      zoneLabel: dom ? zone!.label : null,
      address: dom && addr ? [addr.line, addr.apt].filter(Boolean).join(', ') : 'Recoge en el local',
      addressNotes: dom && addr ? addr.notes : '',
      items: itemsSummary(dev.cart),
      itemsList: itemsDetail(dev.cart),
      lines: orderLines(dev.cart, dev.mode),
      subtotal: sub,
      delivery: fee,
      pay: PAYS.find(p => p.id === dev.pay)?.label ?? PAYS[0].label,
    }
    setBusy(true)
    try {
      if (editing) {
        await store.updateOrder(editing.num, draft)
        setDev(st => ({ cart: [], editingOrder: null, orderCarts: rememberCart(st, editing.num, st.cart) }))
        nav(P.orders, { replace: true })
      } else {
        const order = await store.placeOrder(draft)
        setDev(st => ({ cart: [], lastOrderNum: order.num, editingOrder: null, orderCarts: rememberCart(st, order.num, st.cart) }))
        nav(P.confirm, { replace: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el pedido. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={c.header}><BackButton onClick={() => nav(P.cart)} /><div className={c.headerTitle}>{editing ? `Editar pedido ${orderId(editing.num)}` : 'Confirmar pedido'}</div></div>
      <div className={`${c.scroll} noscroll ${k.body}`}>
        <div className={c.label}>¿Cómo lo recibes?</div>
        <div className={k.modeRow}>
          <button type="button" aria-pressed={dom} className={`${k.mode} ${dom ? k.modeOn : ''}`} onClick={() => setDev({ mode: 'domicilio' })}>Domicilio</button>
          <button type="button" aria-pressed={!dom} className={`${k.mode} ${!dom ? k.modeOn : ''}`} onClick={() => setDev({ mode: 'recoger' })}>Recoger en el local</button>
        </div>

        {dom && (
          <>
            <label className={c.label} htmlFor="barrio" style={{ display: 'block' }}>Barrio <span className={c.req}>*</span></label>
            <div className={k.selectWrap}>
              <select id="barrio" required className={k.select} value={dev.zone} onChange={e => { setDev({ zone: e.target.value }); setError('') }}>
                <option value="" disabled>Selecciona tu barrio…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                <option value={OTHER_ZONE_ID}>Otro (escribe tu barrio)</option>
              </select>
              <span className={k.caret}>▾</span>
            </div>
            {other && (
              <>
                <input className={k.phone} style={{ marginTop: -8 }} value={dev.zoneOther} onChange={e => { setDev({ zoneOther: e.target.value }); setError('') }}
                  placeholder="¿En qué barrio estás?" aria-label="Tu barrio" maxLength={80} autoFocus />
                <div className={c.notice} role="note" style={{ marginTop: -6, marginBottom: 18 }}>
                  <span className={c.noticeIcon} aria-hidden="true">🛵</span>
                  <div><b>El domicilio se paga al recibir el pedido</b>Como tu barrio no está en la lista, el valor del domicilio no va en este total: se cobra al momento de la entrega.</div>
                </div>
              </>
            )}

            <div className={c.label}>¿A dónde lo llevamos? <span className={c.req}>*</span></div>
            <div className={k.stack}>
              {dev.addresses.map(a => {
                const on = !formOpen && dev.selectedAddr === a.id
                const sub2 = [a.apt, a.notes].filter(Boolean).join(' · ')
                return (
                  <button key={a.id} type="button" aria-pressed={on} className={`${k.addr} ${on ? k.addrOn : ''}`} onClick={() => setDev({ selectedAddr: a.id })}>
                    <div className={k.addrLine}>{a.line}</div>{sub2 && <div className={k.addrSub}>{sub2}</div>}
                  </button>
                )
              })}
              {formOpen ? (
                <div className={k.form}>
                  <input className={c.input} value={fLine} onChange={e => { setLine(e.target.value); setError('') }} placeholder="Dirección (ej: Calle 32B # 32C Sur-02)" aria-label="Dirección" autoComplete="street-address" />
                  <input className={c.input} value={fApt} onChange={e => setApt(e.target.value)} placeholder="Apto / Torre / Interior (opcional)" aria-label="Apto / Torre / Interior" />
                  <input className={c.input} value={fNotes} onChange={e => setNotes(e.target.value)} placeholder="Indicaciones para el domiciliario (opcional)" aria-label="Indicaciones para el domiciliario" />
                  <button type="button" className={k.saveBtn} onClick={saveAddr}>Guardar dirección</button>
                </div>
              ) : (
                <button type="button" className={k.addNew} onClick={() => setDev({ selectedAddr: 'new' })}>+ Agregar otra dirección</button>
              )}
            </div>

          </>
        )}

        <label className={c.label} htmlFor="tel" style={{ display: 'block' }}>Celular de contacto <span className={c.req}>*</span></label>
        <input id="tel" className={k.phone} value={dev.phone} onChange={e => { setDev({ phone: e.target.value }); setError('') }} required
          placeholder={dom ? 'Para que el domiciliario te ubique' : 'Para avisarte cuando esté listo'} inputMode="tel" autoComplete="tel" maxLength={20} />

        <div className={c.label}>Método de pago</div>
        <div className={k.stack} role="radiogroup" aria-label="Método de pago">
          {PAYS.map(p => {
            const on = dev.pay === p.id
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} className={`${k.pay} ${on ? k.payOn : ''}`} onClick={() => setDev({ pay: p.id })}>
                <span>{p.label}</span><span style={{ color: on ? 'var(--red)' : '#cfc6b5' }}>{on ? '●' : '○'}</span>
              </button>
            )
          })}
        </div>
        <div className={k.hours}>Horario de cocina: 11:30am – 4pm. Los pedidos se preparan al momento.</div>
      </div>
      <div className={c.footer}>
        <div className={k.row}><span>Subtotal</span><span>{fmt(sub)}</span></div>
        {discount > 0 && <div className={k.row} style={{ color: 'var(--red)' }}><span>{discountName(discKind)}</span><span>−{fmt(discount)}</span></div>}
        <div className={k.row} style={{ marginBottom: 10 }}>
          <span>Domicilio{dom ? '' : ' (recoge en local)'}</span><span>{!dom ? 'Recoge' : other ? 'Se paga al recibir' : zone ? fmt(fee) : '—'}</span>
        </div>
        <div className={k.total}><span>Total{other ? ' (sin domicilio)' : ''}</span><span>{fmt(total)}</span></div>
        {error && <div className={c.error} role="alert">{error}</div>}
        <button type="button" className={c.primary} disabled={busy} onClick={place}>{busy ? 'Enviando…' : editing ? 'Guardar cambios' : 'Hacer pedido'}</button>
      </div>
    </>
  )
}
