import { useNavigate } from 'react-router-dom'
import { dateTime, orderId } from '../../domain/format.ts'
import { clientState, clientSteps, hasUnread, STAGE } from '../../domain/orders.ts'
import { useSnapshot } from '../../data/hooks.ts'
import { Tono, TonoPoseSvg } from '../../ui/Tono.tsx'
import { UnreadDot } from '../../ui/ui.tsx'
import ui from '../../ui/ui.module.css'
import { P } from '../paths.ts'
import c from '../c.module.css'
import x from './Orders.module.css'

export function Orders() {
  const nav = useNavigate()
  const orders = useSnapshot().orders
  return (
    <>
      <div className={x.head}><div className={c.pageTitle}>Mis pedidos</div><div className={x.sub}>Sigue tu pedido en vivo</div></div>
      <div className={`${c.scroll} noscroll ${x.body}`}>
        {orders.length === 0 && (
          <div className={c.empty} style={{ padding: '44px 20px' }}>
            <div className="bob" style={{ width: 72, height: 80, margin: '0 auto 10px' }}><Tono variant="ordersEmpty" width={72} height={80} /></div>
            <div>Aún no tienes pedidos.<br />Explora el menú y realiza tu primer pedido.</div>
            <button type="button" className={c.darkBtn} style={{ marginTop: 20 }} onClick={() => nav(P.menu)}>Ver el menú</button>
          </div>
        )}
        <div className={x.list}>
          {orders.map(o => {
            const rej = o.status === 'rechazado'
            const n = STAGE[o.status]
            const st = clientState(o)
            return (
              <div key={o.num} className={x.card}>
                <div className={x.top}><div className={x.id}>{orderId(o.num)}</div><div className={x.when}>{dateTime(o.createdAt)}</div></div>
                <div className={x.items}>{o.items}</div>
                <div className={ui.tip} style={{ marginTop: 14, borderRadius: 14, padding: '11px 13px' }}>
                  <div className="bob" style={{ flex: 'none', width: 46, height: 52 }}><TonoPoseSvg pose={st.pose} size={50} /></div>
                  <div className={ui.tipText} style={{ lineHeight: 1.45 }} aria-live="polite"><b>Toño:</b> {st.msg}</div>
                </div>
                {rej && <div className={x.rejected}>Pedido rechazado · {o.rejectReason}</div>}
                <div className={x.steps}>
                  {clientSteps(o.origin).map((lbl, i) => {
                    const done = !rej && i <= n
                    return (
                      <div key={lbl} className={x.step}>
                        {done ? <span className={x.stepDone}>✓</span> : <span className={x.stepTodo} />}
                        <span className={x.stepLabel}>{lbl}</span>
                      </div>
                    )
                  })}
                </div>
                <button type="button" className={x.chatBtn} onClick={() => nav(P.chat(o.num))}>
                  💬 Chat con el restaurante
                  {hasUnread(o, 'cliente') && <UnreadDot size={14} top={-5} right={-5} />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
