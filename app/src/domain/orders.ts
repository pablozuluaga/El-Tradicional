import type { CartLine, Order, OrderLine, OrderStatus, Origin, Sender, Settings } from './types.ts'
import { OTHER_ZONE_ID } from './catalog.ts'
import { unitPrice } from './pricing.ts'

export const WELCOME_MSG = 'Hemos recibido tu pedido. Si necesitas algo, puedes escribirnos por este chat. 🙌'

const lower = (xs: string[]) => xs.map(x => x.toLowerCase())

/** Summary line used on cards and history, e.g. "2 Bandeja Paisa (Res, jugo, sin arepa)". */
export function itemsSummary(cart: CartLine[]): string {
  return cart.map(c => {
    const extras: string[] = []
    if (c.proteinLabel) extras.push(c.proteinLabel)
    if (c.juiceLabel) extras.push(c.juiceLabel.toLowerCase())
    extras.push(...lower(c.opts))
    if (c.removed.length) extras.push('sin ' + c.removed.join(', ').toLowerCase())
    if (c.addons?.length) extras.push('adición: ' + c.addons.join(', ').toLowerCase())
    return c.qty + ' ' + c.name + (extras.length ? ' (' + extras.join(', ') + ')' : '')
  }).join(' · ')
}

/** Detail lines for the owner, e.g. "1× Bandeja Paisa — res, jugo, sin arepa, nota: bien caliente". */
export function itemsDetail(cart: CartLine[]): string[] {
  return cart.map(c => {
    const extras: string[] = []
    if (c.proteinLabel) extras.push(c.proteinLabel.toLowerCase())
    if (c.juiceLabel) extras.push(c.juiceLabel.toLowerCase())
    extras.push(...lower(c.opts))
    if (c.removed.length) extras.push('sin ' + c.removed.join(', ').toLowerCase())
    if (c.addons?.length) extras.push('adición: ' + c.addons.join(', ').toLowerCase())
    if (c.note) extras.push('nota: ' + c.note)
    return c.qty + '× ' + c.name + (extras.length ? ' — ' + extras.join(', ') : '')
  })
}

export const orderLines = (cart: CartLine[], mode: Origin): OrderLine[] =>
  cart.map(c => ({ dishId: c.dishId, name: c.name, qty: c.qty, unit: unitPrice(c, mode) }))

/** Barrio "Otro": the customer pays the delivery on arrival; the owner notes its price for their own totals. */
const BUILDING = 'Edificio / Apto / Torre: '

/**
 * The building/apartment travels inside the delivery notes (its own first line), so the address
 * itself stays the literal street address that Google Maps can find.
 */
export const packAddressNotes = (apt: string, notes: string) =>
  [apt.trim() && BUILDING + apt.trim(), notes.trim()].filter(Boolean).join('\n')

export function splitAddressNotes(s: string): { apt: string; notes: string } {
  const [first, ...rest] = s.split('\n')
  return first.startsWith(BUILDING) ? { apt: first.slice(BUILDING.length), notes: rest.join('\n') } : { apt: '', notes: s }
}

export const isOtherZoneOrder = (o: Pick<Order, 'origin' | 'zoneId'>) => o.origin === 'domicilio' && o.zoneId === OTHER_ZONE_ID

/**
 * Delivery and total as the owner sees them: for a barrio "Otro" order the delivery is the price
 * the owner assigned (`Settings.deliveryFees`), or null while not assigned yet.
 */
export function ownerAmounts(o: Order, fees: Record<string, number>): { delivery: number | null; total: number } {
  if (!isOtherZoneOrder(o)) return { delivery: o.delivery, total: o.total }
  const assigned = fees[String(o.num)] ?? (o.delivery || null)
  return { delivery: assigned, total: o.total - o.delivery + (assigned ?? 0) }
}

export const MAX_DELIVERY_FEE = 100000

export const originLabel = (o: Origin) => (o === 'domicilio' ? 'Domicilio' : 'Recoger en el local')

// ---- status flow -------------------------------------------------------

// The owner's last step is "en camino" (or "listo para recoger"); from then on the order counts as delivered.
// 'listo' only remains on older orders.
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { nuevo: 'aceptado', aceptado: 'camino' }

/** Delivered from the owner's point of view: no more steps, the card fades. */
export const isFinished = (s: OrderStatus) => s === 'camino' || s === 'listo'

const NOTE_DOM: Partial<Record<OrderStatus, string>> = {
  aceptado: 'Pedido confirmado. Comenzamos con la preparación. 👨‍🍳',
  camino: 'Tu pedido está en camino. 🛵',
  listo: 'Pedido entregado. ¡Buen provecho! 😋',
}
const NOTE_PICK: Partial<Record<OrderStatus, string>> = {
  ...NOTE_DOM,
  camino: 'Tu pedido está listo para recoger en el local. 🥡',
}

/** Next status and the automatic chat note the customer receives, or null at the end of the flow. */
export function advanceStep(o: Pick<Order, 'status' | 'origin'>): { status: OrderStatus; note: string } | null {
  const ns = NEXT[o.status]
  if (!ns) return null
  return { status: ns, note: (o.origin === 'recoger' ? NOTE_PICK : NOTE_DOM)[ns]! }
}

export const canReject = (s: OrderStatus) => s === 'nuevo' || s === 'aceptado'

export const rejectNote = (reason: string) => `Lamentamos informarte que no pudimos procesar tu pedido: ${reason}. Acepta nuestras disculpas.`

export const normalizeReason = (r: string) => r.trim() || 'Sin especificar'

// ---- presentation helpers (owner + customer) ------------------------------

export const STAGE: Record<OrderStatus, number> = { nuevo: 0, aceptado: 1, camino: 2, listo: 2, rechazado: 0 }
export const STAGE_MAX = 2

export const OWNER_BADGE: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  nuevo: { label: 'Nuevo', bg: '#7a3410', fg: '#F6C88B' },
  aceptado: { label: 'Aceptado', bg: '#3a3a14', fg: '#E7DE8B' },
  camino: { label: 'Entregado', bg: '#183a20', fg: '#8FD09E' },
  listo: { label: 'Entregado', bg: '#183a20', fg: '#8FD09E' },
  rechazado: { label: 'Rechazado', bg: '#4a1414', fg: '#F0A0A0' },
}

export const BAR_COLORS = ['#5a5348', '#9a8f3a', '#4FC85E']

export function advanceLabel(o: Pick<Order, 'status' | 'origin'>): string | null {
  if (o.status === 'nuevo') return 'Aceptar pedido'
  if (o.status === 'aceptado') return o.origin === 'recoger' ? 'Marcar listo para recoger' : 'Marcar en camino'
  return null
}

export const clientSteps = (origin: Origin) =>
  origin === 'recoger' ? ['Recibido', 'Aceptado', 'Listo para recoger'] : ['Recibido', 'Aceptado', 'En camino']

export type TonoPose = 'smile' | 'wave' | 'celebrate' | 'sad' | 'eat'

export function clientState(o: Pick<Order, 'status' | 'origin'>): { pose: TonoPose; msg: string } {
  switch (o.status) {
    case 'nuevo': return { pose: 'smile', msg: 'Tu pedido fue enviado a la cocina. En un momento lo confirmamos.' }
    case 'aceptado': return { pose: 'wave', msg: 'Pedido confirmado. Ya comenzamos con la preparación.' }
    case 'camino': return o.origin === 'recoger'
      ? { pose: 'wave', msg: 'Tu pedido está listo para recoger en el local. 🥡' }
      : { pose: 'wave', msg: 'Tu pedido está en camino. Ten listo el pago, por favor. 🛵' }
    case 'listo': return { pose: 'celebrate', msg: 'Pedido entregado. ¡Buen provecho! 😋' }
    case 'rechazado': return { pose: 'sad', msg: 'Lamentablemente no pudimos procesar tu pedido. Revisa el motivo abajo.' }
  }
}

export const statusName = (o: Pick<Order, 'status' | 'origin'>) =>
  o.status === 'camino' ? (o.origin === 'recoger' ? 'Listo para recoger' : 'En camino') : OWNER_BADGE[o.status].label

// ---- unread ---------------------------------------------------------------

const other = (me: Sender): Sender => (me === 'cliente' ? 'dueno' : 'cliente')

/** True when the other party wrote after the last message this side has seen. */
export function hasUnread(o: Pick<Order, 'chat' | 'clientSeenId' | 'ownerSeenId'>, me: Sender): boolean {
  const seen = me === 'cliente' ? o.clientSeenId : o.ownerSeenId
  return o.chat.some(m => m.from === other(me) && m.id > seen)
}

export const lastMessageId = (o: Pick<Order, 'chat'>) => o.chat.reduce((m, x) => Math.max(m, x.id), 0)

// ---- owner list filter ------------------------------------------------------

export type OrderPeriod = 'todos' | 'semana' | 'hoy'

/** Calendar date in Colombia (UTC-5 all year) as a day number, so "today" doesn't depend on the device's zone. */
const bogotaDayNum = (d: Date) => Math.floor((d.getTime() - 5 * 3600_000) / 86_400_000)

/** Orders from today, from this week (Monday to Sunday) or all of them. */
export function ordersInPeriod<T extends Pick<Order, 'createdAt'>>(orders: T[], period: OrderPeriod, now = new Date()): T[] {
  if (period === 'todos') return orders
  const today = bogotaDayNum(now)
  // 1970-01-01 was a Thursday: day 0 → weekday index 3 when Monday = 0
  const from = period === 'hoy' ? today : today - ((today + 3) % 7)
  return orders.filter(o => bogotaDayNum(new Date(o.createdAt)) >= from)
}

/** Orders minus the ones the owner deleted (`Settings.deletedOrders`). */
export const visibleOrders = (orders: Order[], s: Pick<Settings, 'deletedOrders'>): Order[] => {
  const del = s.deletedOrders ?? {}
  return Object.keys(del).length ? orders.filter(o => !del[String(o.num)]) : orders
}
