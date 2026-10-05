import { ownerAmounts } from './orders.ts'
import type { Order } from './types.ts'

export interface ReportRow {
  numero: number
  fecha: Date
  cliente: string
  pedido: string
  metodoPago: string
  valorPlato: number
  valorDomicilio: number
  correo: string
  celular: string
}

/** Local-time bounds from `<input type="date">` values ('' = open end). */
export function reportRange(from: string, to: string) {
  const f = from.trim(), t = to.trim()
  return { desde: f ? new Date(f + 'T00:00:00') : null, hasta: t ? new Date(t + 'T23:59:59.999') : null }
}

export const inRange = (iso: string, desde: Date | null, hasta: Date | null) => {
  const d = new Date(iso)
  return !(desde && d < desde) && !(hasta && d > hasta)
}

/** Billing rows: rejected and deleted orders are not sales, so they are left out. */
export function reportRows(orders: Order[], from: string, to: string, fees: Record<string, number> = {}, deleted: Record<string, boolean> = {}): ReportRow[] {
  const { desde, hasta } = reportRange(from, to)
  return orders
    .filter(o => o.status !== 'rechazado' && !deleted[String(o.num)] && inRange(o.createdAt, desde, hasta))
    .map(o => ({
      numero: o.num,
      fecha: new Date(o.createdAt),
      cliente: o.name,
      pedido: o.itemsList.length ? o.itemsList.join(' · ') : o.items,
      metodoPago: o.pay,
      valorPlato: Math.max(0, o.subtotal - o.discount),
      valorDomicilio: ownerAmounts(o, fees).delivery ?? 0,
      correo: o.email,
      celular: o.phone && o.phone !== '—' ? o.phone : '',
    }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}
