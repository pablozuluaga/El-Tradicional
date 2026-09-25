import { useNavigate } from 'react-router-dom'
import { fmt } from '../../domain/format.ts'
import { subtotal, unitPrice } from '../../domain/pricing.ts'
import { useDevice } from '../../data/hooks.ts'
import { Tono } from '../../ui/Tono.tsx'
import { BackButton, TonoTip } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import k from './Cart.module.css'

export function Cart() {
  const nav = useNavigate()
  const [dev, setDev] = useDevice()
  const cart = dev.cart
  const sub = fmt(subtotal(cart, dev.mode))

  return (
    <>
      <div className={c.header}><BackButton onClick={() => nav(P.menu)} /><div className={c.headerTitle}>Tu pedido</div></div>
      <div className={`${c.scroll} noscroll ${k.body}`}>
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
          <button type="button" className={`${c.primary} ${k.cta}`} onClick={() => nav(P.checkout)}><span>Continuar</span><span>{sub}</span></button>
        </div>
      )}
    </>
  )
}
