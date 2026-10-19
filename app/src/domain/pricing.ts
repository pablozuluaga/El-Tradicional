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


/** What the customer pays: the dishes at full price plus delivery. */
export const orderTotal = (sub: number, delivery: number) => sub + delivery

/** A barrio as it was saved on an order: its id, name and the delivery price charged then. */
export interface ZoneUse { id: string; label: string; fee: number }

/**
 * Barrios that orders were placed from but that are no longer in the list (an older version of
 * the panel could overwrite the list). `uses` go newest first, so each comes back with its last
 * name and price. "Otro" is the customer's own text, not a barrio of the list.
 */
export function missingZones(uses: ZoneUse[], current: Zone[]): Zone[] {
  const have = new Set(current.map(z => z.id))
  const names = new Set(current.map(z => z.label.trim().toLowerCase()))
  const out: Zone[] = []
  for (const u of uses) {
    const name = u.label?.trim()
    if (!u.id || u.id === OTHER_ZONE_ID || !name || have.has(u.id) || names.has(name.toLowerCase())) continue
    have.add(u.id); names.add(name.toLowerCase())
    out.push({ id: u.id, label: name, fee: Math.max(0, u.fee) })
  }
  return out
}
