import { EMAIL_RE } from './format.ts'
import { eligibilityFromCount } from './loyalty.ts'
import { discountFor, orderTotal } from './pricing.ts'
import type { DiscountKind, OrderDraft, Settings } from './types.ts'

/** Same checks the database runs in `place_order`; returns a customer-facing message or null. */
export function validateDraft(d: OrderDraft, s: Settings): string | null {
  if (!s.storeOpen) return 'La cocina está cerrada en este momento. Atendemos 11:30am – 4pm.'
  if (!d.name.trim()) return 'Falta tu nombre.'
  if (!EMAIL_RE.test(d.email.trim())) return 'Falta un correo válido.'
  if (!d.itemsList.length) return 'Tu carrito está vacío.'
  if (d.origin === 'domicilio') {
    if (!d.zoneId) return 'Selecciona tu barrio.'
    if (!d.address.trim()) return 'Escribe la dirección de entrega.'
  }
  const sold = d.lines.find(l => s.soldDishes[l.dishId])
  if (sold) return `${sold.name} se agotó. Quítalo del carrito para continuar.`
  if (d.lines.some(l => l.dishId === 'dia') && !s.platoDia) return 'El menú del día ya no está disponible. Quítalo del carrito para continuar.'
  return null
}

/** Authoritative totals from the customer's benefit count (see `eligibilityFromCount`). */
export function finalizeTotals(d: OrderDraft, countingOrders: number, emailUsed: boolean): { discount: number; discountKind: DiscountKind | null; total: number } {
  const e = eligibilityFromCount(countingOrders, emailUsed)
  const discount = discountFor(d.subtotal, e.rate)
  return { discount, discountKind: discount > 0 ? e.kind : null, total: orderTotal(d.subtotal, discount, d.delivery) }
}
