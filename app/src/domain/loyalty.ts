import type { DiscountKind, Eligibility, Order } from './types.ts'

export const LOYALTY_EVERY = 10
export const LOYALTY_RATE = 0.2

/** This customer's orders that count toward benefits (rejected orders don't). */
export const countingOrders = (orders: Order[], customerId: string): Order[] =>
  orders.filter(o => o.status !== 'rechazado' && o.customerId === customerId)

/** True when the email already has orders from another device: the welcome discount is once per person. */
export function emailUsedElsewhere(orders: Order[], customerId: string, email: string): boolean {
  const em = email.trim().toLowerCase()
  return !!em && orders.some(o => o.status !== 'rechazado' && o.customerId !== customerId && o.email.trim().toLowerCase() === em)
}

/** 20% on the 1st order (unless the email was already used) and after every 10 orders. Same rule as `place_order` in SQL. */
export function eligibilityFromCount(count: number, emailUsed = false): Eligibility {
  const ready = count % LOYALTY_EVERY === 0 && !(count === 0 && emailUsed)
  const kind: DiscountKind | null = !ready ? null : count === 0 ? 'primer' : 'diez'
  return { rate: ready ? LOYALTY_RATE : 0, kind, count }
}

export const eligibility = (orders: Order[], customerId: string, email: string) =>
  eligibilityFromCount(countingOrders(orders, customerId).length, emailUsedElsewhere(orders, customerId, email))

export const discountName = (kind: DiscountKind | null) => (kind === 'diez' ? 'Premio 10 pedidos (-20%)' : 'Descuento primer pedido (-20%)')

export function loyaltyCard(e: Eligibility) {
  const welcome = e.kind === 'primer'
  const reward = e.kind === 'diez'
  const n = e.count % LOYALTY_EVERY
  return {
    title: welcome ? '¡Tienes -20% de bienvenida!' : reward ? '¡Ganaste -20% por tus 10 pedidos!' : 'Cliente frecuente',
    sub: welcome ? 'Se aplica automáticamente en tu primer pedido por la app.' : reward ? 'Se aplica en tu próximo pedido.' : 'Completa 10 pedidos y ganas -20%.',
    stamps: Array.from({ length: LOYALTY_EVERY }, (_, i) => i < n),
    label: reward ? '¡Completaste 10 pedidos! Tu -20% está listo 🎉' : `Vas por ${n} de 10 · a los 10 ganas -20%`,
  }
}

/** Profile stats from the customer's own non-rejected orders. */
export function profileStats(myOrders: Order[]) {
  const valid = myOrders.filter(o => o.status !== 'rechazado')
  const byDish = new Map<string, number>()
  for (const o of valid) for (const l of o.lines) byDish.set(l.name, (byDish.get(l.name) ?? 0) + l.qty)
  let fav = '—', best = 0
  for (const [name, q] of byDish) if (q > best) { best = q; fav = name }
  return { pedidos: valid.length, favorito: fav }
}
