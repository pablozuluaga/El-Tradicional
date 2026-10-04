import { useNavigate } from 'react-router-dom'
import { fmt, orderId } from '../../domain/format.ts'
import { subtotal, unitPrice } from '../../domain/pricing.ts'
import { useDevice, useSnapshot } from '../../data/hooks.ts'
import { isEditable, startEdit } from '../editOrder.ts'
import { Tono } from '../../ui/Tono.tsx'
import { BackButton, TonoTip } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import k from './Cart.module.css'

export function Cart() {
  const nav = useNavigate()
  const [dev, setDev] = useDevice()
  const orders = useSnapshot().orders
  const cart = dev.cart
  const sub = fmt(subtotal(cart, dev.mode))
  const editing = dev.editingOrder !== null ? orders.find(o => o.num === dev.editingOrder) ?? null : null
  const editable = dev.editingOrder === null ? orders.filter(o => isEditable(o, dev)) : []
  const edit = (num: number) => {
    const o = orders.find(x => x.num === num)
    if (!o) return
    if (cart.length && !confirm('Tu carrito actual se reemplazará por el pedido ' + orderId(num) + '. ¿Continuar?')) return
    setDev(st => startEdit(o, st))
  }

  return (
    <>
      <div className={c.header}><BackButton onClick={() => nav(P.menu)} /><div className={c.headerTitle}>Tu pedido</div></div>
      <div className={`${c.scroll} noscroll ${k.body}`}>
        {dev.editingOrder !== null && (
          <div className={c.notice} role="status" style={{ marginBottom: 14 }}>
            <span className={c.noticeIcon} aria-hidden="true">✏️</span>
            <div>
              <b>Estás editando el pedido {orderId(dev.editingOrder)}</b>
              {editing && editing.status !== 'nuevo'
                ? <>El restaurante ya lo aceptó, así que no se puede cambiar. Escríbenos por el chat.</>
                : <>Quita lo que no quieras, agrega más desde el menú y toca Revisar cambios para guardarlos.</>}
              <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                <button type="button" className={k.remove} style={{ margin: 0 }} onClick={() => nav(P.menu)}>+ Agregar platos</button>
                <button type="button" className={k.remove} style={{ margin: 0 }} onClick={() => setDev({ cart: [], editingOrder: null })}>Cancelar edición</button>
              </div>
            </div>
          </div>
        )}
        {editable.map(o => (
          <div key={o.num} className={c.notice} style={{ marginBottom: 14, background: '#fff', borderColor: 'var(--line-3)' }}>
            <span className={c.noticeIcon} aria-hidden="true">🧾</span>
            <div style={{ flex: 1 }}>
              <b>Tu pedido {orderId(o.num)} está esperando confirmación</b>
              {o.items}
              <div><button type="button" className={c.darkBtn} style={{ marginTop: 10, padding: '9px 16px' }} onClick={() => edit(o.num)}>✏️ Editar pedido</button></div>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className={c.empty}>
            <div className="bob" style={{ width: 76, height: 84, margin: '0 auto 10px' }}><Tono variant="cartEmpty" width={76} height={84} /></div>
            <div>Tu carrito está vacío.<br />Explora nuestro menú y elige lo que se te antoje.</div>
            <button type="button" className={c.darkBtn} style={{ marginTop: 20 }} onClick={() => nav(P.menu)}>Ver el menú</button>
          </div>
        )}
        <div className={k.list}>
          {cart.map(it => (
            <div key={it.key} className={k.item}>
              <div className={k.itemRow}><div>{it.qty}× {it.name}</div><div style={{ whiteSpace: 'nowrap' }}>{fmt(unitPrice(it, dev.mode) * it.qty)}</div></div>
              {it.opts.length > 0 && <div className={k.meta}>{it.opts.join(' · ')}</div>}
              {it.proteinLabel && <div className={k.meta}>Proteína: {it.proteinLabel}</div>}
              {it.juiceLabel && <div className={k.meta} style={{ marginTop: 2 }}>Bebida: {it.juiceLabel}</div>}
              {it.addons && it.addons.length > 0 && <div className={k.meta} style={{ marginTop: 2 }}>Adición: {it.addons.join(', ')}</div>}
              {it.removed.length > 0 && <div className={k.removed}>Sin {it.removed.join(', ').toLowerCase()}</div>}
              {it.note && <div className={k.meta} style={{ marginTop: 2, fontStyle: 'italic' }}>“{it.note}”</div>}
              <button type="button" className={k.remove} onClick={() => setDev(st => ({ cart: st.cart.filter(x => x.key !== it.key) }))}>Quitar</button>
            </div>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div className={c.footer}>
          <TonoTip variant="eating" w={40} h={44} style={{ gap: 11, borderRadius: 14, padding: '9px 11px', marginBottom: 12 }} textStyle={{ fontSize: 12 }}>
            Recuerda que la bebida va incluida con tu plato, sin costo adicional. ¡Disfruta tu comida!
          </TonoTip>
          <div className={k.row}><span>Subtotal</span><span>{sub}</span></div>
          <div className={k.note}>Domicilio y descuentos se calculan al confirmar.</div>
          <button type="button" className={`${c.primary} ${k.cta}`} onClick={() => nav(P.checkout)}><span>{dev.editingOrder !== null ? 'Revisar cambios' : 'Continuar'}</span><span>{sub}</span></button>
        </div>
      )}
    </>
  )
}
