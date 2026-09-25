import { ZONES } from './catalog.ts'
import type { CartLine, Origin } from './types.ts'

export const unitPrice = (c: CartLine, mode: Origin) => (mode === 'domicilio' ? c.domPrice || c.basePrice : c.basePrice)

export const subtotal = (cart: CartLine[], mode: Origin) => cart.reduce((t, c) => t + c.qty * unitPrice(c, mode), 0)

export const zoneById = (id: string | null) => (id ? ZONES.find(z => z.id === id) ?? null : null)

/** The barrio fee replaces any delivery base price; pickup is always free. */
export const deliveryFee = (mode: Origin, zoneId: string | null) => (mode === 'domicilio' ? zoneById(zoneId)?.fee ?? 0 : 0)

export const discountFor = (sub: number, rate: number) => Math.round(sub * rate)

export const orderTotal = (sub: number, discount: number, delivery: number) => Math.max(0, sub - discount + delivery)
