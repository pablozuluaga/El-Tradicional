import { OTHER_ZONE_ID, ZONES, type Zone } from './catalog.ts'
import type { CartLine, Origin, Settings } from './types.ts'

export const unitPrice = (c: CartLine, mode: Origin) => (mode === 'domicilio' ? c.domPrice || c.basePrice : c.basePrice)

export const subtotal = (cart: CartLine[], mode: Origin) => cart.reduce((t, c) => t + c.qty * unitPrice(c, mode), 0)

/** The barrios the customer can pick, as the owner left them (or the default list). */
export const zonesOf = (s?: Pick<Settings, 'zones'> | null): Zone[] => s?.zones ?? ZONES

export const zoneById = (id: string | null, zones: Zone[] = ZONES) => (id ? zones.find(z => z.id === id) ?? null : null)

/** The barrio fee replaces any delivery base price; pickup is always free, and "Otro" waits for the owner. */
export const deliveryFee = (mode: Origin, zoneId: string | null, zones: Zone[] = ZONES) => (mode === 'domicilio' ? zoneById(zoneId, zones)?.fee ?? 0 : 0)

/** Barrio "Otro" (typed by the customer): the owner sets the delivery fee on the order. */
export const isOtherZone = (mode: Origin, zoneId: string | null) => mode === 'domicilio' && zoneId === OTHER_ZONE_ID

export const discountFor = (sub: number, rate: number) => Math.round(sub * rate)

export const orderTotal = (sub: number, discount: number, delivery: number) => Math.max(0, sub - discount + delivery)
