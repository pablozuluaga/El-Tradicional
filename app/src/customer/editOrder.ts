import { newId } from '../domain/ids.ts'
import { OTHER_ZONE_ID } from '../domain/catalog.ts'
import type { CartLine, Order } from '../domain/types.ts'
import type { DeviceState } from '../data/device.ts'

/** Orders the customer can still change: not accepted yet, placed from this device. */
export const isEditable = (o: Order, d: DeviceState) => o.status === 'nuevo' && !!d.orderCarts?.[String(o.num)]?.length

/** Loads an order back into the cart for editing (mode and barrio included). */
export function startEdit(o: Order, d: DeviceState): Partial<DeviceState> {
  const cart: CartLine[] = (d.orderCarts[String(o.num)] ?? []).map(l => ({ ...l, key: newId() }))
  return {
    cart,
    editingOrder: o.num,
    mode: o.origin,
    ...(o.origin === 'domicilio' && o.zoneId ? { zone: o.zoneId } : {}),
    ...(o.zoneId === OTHER_ZONE_ID ? { zoneOther: o.zoneLabel ?? '' } : {}),
  }
}

/** Remembers the cart an order was placed (or saved) with; keeps the last 10. */
export function rememberCart(d: DeviceState, num: number, cart: CartLine[]): Record<string, CartLine[]> {
  const next = { ...d.orderCarts, [String(num)]: cart }
  const keys = Object.keys(next).sort((a, b) => Number(b) - Number(a)).slice(0, 10)
  return Object.fromEntries(keys.map(k => [k, next[k]]))
}
