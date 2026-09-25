import type { CartLine, Order, OrderLine, OrderStatus, Origin, Sender } from './types.ts'
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
    if (c.note) extras.push('nota: ' + c.note)
    return c.qty + '× ' + c.name + (extras.length ? ' — ' + extras.join(', ') : '')
  })
}

export const orderLines = (cart: CartLine[], mode: Origin): OrderLine[] =>
  cart.map(c => ({ dishId: c.dishId, name: c.name, qty: c.qty, unit: unitPrice(c, mode) }))

export const originLabel = (o: Origin) => (o === 'domicilio' ? 'Domicilio' : 'Recoger en el local')

// ---- status flow -------------------------------------------------------

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { nuevo: 'aceptado', aceptado: 'camino', camino: 'listo' }

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

export const STAGE: Record<OrderStatus, number> = { nuevo: 0, aceptado: 1, camino: 2, listo: 3, rechazado: 0 }
export const STAGE_MAX = 3

export const OWNER_BADGE: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  nuevo: { label: 'Nuevo', bg: '#7a3410', fg: '#F6C88B' },
  aceptado: { label: 'Aceptado', bg: '#3a3a14', fg: '#E7DE8B' },
  camino: { label: 'En camino', bg: '#183a20', fg: '#8FD09E' },
  listo: { label: 'Entregado', bg: '#183a20', fg: '#8FD09E' },
  rechazado: { label: 'Rechazado', bg: '#4a1414', fg: '#F0A0A0' },
}

export const BAR_COLORS = ['#5a5348', '#9a8f3a', '#4FC85E', '#3DFF7E']

export function advanceLabel(o: Pick<Order, 'status' | 'origin'>): string | null {
  if (o.status === 'nuevo') return 'Aceptar pedido'
  if (o.status === 'aceptado') return o.origin === 'recoger' ? 'Marcar listo para recoger' : 'Marcar en camino'
  if (o.status === 'camino') return 'Marcar entregado'
  return null
}

export const clientSteps = (origin: Origin) =>
  origin === 'recoger' ? ['Recibido', 'Aceptado', 'Listo para recoger', 'Entregado'] : ['Recibido', 'Aceptado', 'En camino', 'Entregado']

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
  o.origin === 'recoger' && o.status === 'camino' ? 'Listo para recoger' : OWNER_BADGE[o.status].label

// ---- unread ---------------------------------------------------------------

const other = (me: Sender): Sender => (me === 'cliente' ? 'dueno' : 'cliente')

/** True when the other party wrote after the last message this side has seen. */
export function hasUnread(o: Pick<Order, 'chat' | 'clientSeenId' | 'ownerSeenId'>, me: Sender): boolean {
  const seen = me === 'cliente' ? o.clientSeenId : o.ownerSeenId
  return o.chat.some(m => m.from === other(me) && m.id > seen)
}

export const lastMessageId = (o: Pick<Order, 'chat'>) => o.chat.reduce((m, x) => Math.max(m, x.id), 0)
