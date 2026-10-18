import type { DiscountKind, Order } from './types.ts'

/**
 * The restaurant no longer runs promotions or discounts. Orders placed before that may still
 * carry one: this names it in the owner's order detail.
 */
export const discountName = (kind: DiscountKind | null) => (kind === 'diez' ? 'Premio 10 pedidos (-20%)' : 'Descuento primer pedido (-20%)')

/** Profile stats from the customer's own non-rejected orders. */
export function profileStats(myOrders: Order[]) {
  const valid = myOrders.filter(o => o.status !== 'rechazado')
  const byDish = new Map<string, number>()
  for (const o of valid) for (const l of o.lines) byDish.set(l.name, (byDish.get(l.name) ?? 0) + l.qty)
  let fav = '—', best = 0
  for (const [name, q] of byDish) if (q > best) { best = q; fav = name }
  return { pedidos: valid.length, favorito: fav }
}
