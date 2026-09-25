import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { INSTAGRAM_URL, REVIEW_URL } from '../../config.ts'
import { orderId } from '../../domain/format.ts'
import { useDevice, useSnapshot, useStore } from '../../data/hooks.ts'
import { InstagramIcon, TonoTip } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import x from './Confirm.module.css'

export function Confirm() {
  const nav = useNavigate()
  const store = useStore()
  const snap = useSnapshot()
  const [dev] = useDevice()
  const order = snap.orders.find(o => o.num === dev.lastOrderNum)
  const [comment, setComment] = useState(order?.reviewComment ?? '')
  if (!order) return snap.ready ? <Navigate to={P.home} replace /> : null

  const stars = order.reviewStars ?? 0
  const saveComment = () => { if ((order.reviewComment ?? '') !== comment.trim()) void store.setReview(order.num, { comment }) }

  return (
    <div className={`${x.wrap} noscroll`}>
      <div className={x.inner}>
        <div className={x.check} aria-hidden="true">✓</div>
        <div className={x.title}>¡Pedido recibido!</div>
        <div className={x.text}>
          {order.origin === 'domicilio'
            ? <>Ya le avisamos a la cocina. Tu pedido {orderId(order.num)} llega en <b>35–45 min</b> a {order.zoneLabel}.</>
            : <>Ya le avisamos a la cocina. Tu pedido {orderId(order.num)} te espera en el local; te avisamos por el chat cuando esté <b>listo para recoger</b>.</>}
        </div>
        <TonoTip variant="confirm" w={48} h={52} style={{ marginTop: 18, padding: '12px 14px', textAlign: 'left', width: '100%' }} textStyle={{ lineHeight: 1.45 }}>
          Gracias por tu pedido. Guarda tu dirección en el perfil para que la próxima vez el proceso sea aún más rápido. 🛵
        </TonoTip>
        <div className={x.loyal}>
          <div className={x.loyalHead}>Fidelidad</div>
          <div className={x.loyalText}>Sigue juntando pedidos: ¡al llegar a 10 ganas un -20%! 🎉</div>
        </div>
        <div className={x.review}>
          <div className={x.reviewTitle}>¿Cómo estuvo todo?</div>
          <div className={x.reviewSub}>Califica tu experiencia y ayúdanos a crecer.</div>
          <div className={x.stars} role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                className={`${x.star} ${n <= stars ? x.starOn : ''}`} onClick={() => void store.setReview(order.num, { stars: n })}>★</button>
            ))}
          </div>
          <textarea className={x.comment} value={comment} onChange={e => setComment(e.target.value)} onBlur={saveComment}
            placeholder="Escribe un comentario (opcional)" rows={2} maxLength={500} aria-label="Comentario" />
          <a className={x.ig} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><InstagramIcon size={17} />Seguir en Instagram</a>
          <a className={x.google} href={REVIEW_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => void store.setReview(order.num, { rated: true, comment })}>⭐ Calificar en Google</a>
          {order.rated && <div className={x.thanks}>¡Gracias por calificarnos!</div>}
        </div>
        <button type="button" className={x.again} onClick={() => nav(P.home)}>Hacer otro pedido</button>
        <button type="button" className={x.track} onClick={() => nav(P.orders)}>Seguir mi pedido</button>
      </div>
    </div>
  )
}
