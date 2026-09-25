import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hasUnread } from '../domain/orders.ts'
import { useDevice, useSnapshot } from '../data/hooks.ts'
import { Silhouette, UnreadDot } from '../ui/ui.tsx'
import { P } from './paths.ts'
import o from './overlays.module.css'

export function BottomNav() {
  const nav = useNavigate()
  const path = useLocation().pathname
  const [dev] = useDevice()
  const orders = useSnapshot().orders
  const count = dev.cart.reduce((t, c) => t + c.qty, 0)
  const unread = orders.some(x => hasUnread(x, 'cliente'))
  const tab = (to: string, icon: ReactNode, label: string, extra?: ReactNode) => {
    const on = path === to
    return (
      <button type="button" className={`${o.tab} ${on ? o.tabOn : ''}`} aria-current={on ? 'page' : undefined} onClick={() => nav(to)}>
        <span className={o.tabIcon} aria-hidden="true">{icon}</span>{label}{extra}
      </button>
    )
  }
  return (
    <nav className={o.nav} aria-label="Navegación principal">
      {tab(P.home, '⌂', 'Inicio')}
      {tab(P.menu, '☰', 'Menú')}
      {tab(P.cart, '🛒', 'Carrito', count > 0 && <span className={o.badge}>{count}</span>)}
      {tab(P.orders, <>🧾{unread && <UnreadDot size={10} top={-3} right={-6} />}</>, 'Pedidos')}
      {tab(P.profile, <Silhouette size={19} stroke="currentColor" width={2} />, 'Perfil')}
    </nav>
  )
}
