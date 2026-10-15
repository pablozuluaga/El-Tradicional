import { dateTime, fmt, orderId } from '../../domain/format.ts'
import { ownerAmounts, splitAddressNotes } from '../../domain/orders.ts'
import type { LineDetail, Order } from '../../domain/types.ts'

/**
 * One kitchen ticket ("comanda") as a list of blocks, independent of how it gets printed.
 * `big` and `inverse` are what the cooks read from the rack: the order number, delivery or
 * pickup, each dish and, above all, what to leave out.
 */
export type Block =
  | { kind: 'brand'; text: string }
  | { kind: 'number'; text: string }
  | { kind: 'center'; text: string }
  | { kind: 'banner'; text: string }
  | { kind: 'text'; text: string; bold?: boolean }
  | { kind: 'dish'; text: string }
  | { kind: 'sin'; text: string }
  | { kind: 'row'; left: string; right: string; bold?: boolean }
  | { kind: 'rule' }
  | { kind: 'gap' }

export interface TicketLine { qty: number; name: string; detail: LineDetail }

const BLANK: LineDetail = { opts: [], removed: [], addons: [], note: '' }

/**
 * Reads a dish back from its detail line ("2× Bandeja Paisa — res, jugo, sin arroz, maduro,
 * adición: huevo, nota: bien caliente") for orders saved before lines carried `detail`.
 */
export function parseDetailLine(s: string): TicketLine {
  const m = /^(\d+)\s*×\s*(.*)$/.exec(s.trim())
  const qty = m ? Number(m[1]) : 1
  const rest = m ? m[2] : s.trim()
  const [name, tail] = rest.split(' — ')
  const d: LineDetail = { opts: [], removed: [], addons: [], note: '' }
  if (!tail) return { qty, name: name.trim(), detail: d }
  // the note is free text and comes last, so take it whole before splitting on commas
  const noteAt = tail.indexOf('nota: ')
  const head = noteAt >= 0 ? tail.slice(0, noteAt).replace(/,\s*$/, '') : tail
  if (noteAt >= 0) d.note = tail.slice(noteAt + 6).trim()
  let into: string[] = d.opts
  for (const raw of head.split(', ')) {
    let part = raw.trim()
    if (!part) continue
    if (part.startsWith('sin ')) { into = d.removed; part = part.slice(4) }
    else if (part.startsWith('adición: ')) { into = d.addons; part = part.slice(9) }
    into.push(part)
  }
  return { qty, name: name.trim(), detail: d }
}

/** The order's dishes with their kitchen detail (structured when saved, parsed otherwise). */
export function ticketLines(o: Order): TicketLine[] {
  if (o.lines.length && o.lines.every(l => l.detail)) {
    return o.lines.map(l => ({ qty: l.qty, name: l.name, detail: l.detail ?? BLANK }))
  }
  return (o.itemsList.length ? o.itemsList : [o.items]).filter(Boolean).map(parseDetailLine)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The comanda for an order. `fees` are the delivery prices the owner set for barrio "Otro". */
export function buildTicket(o: Order, fees: Record<string, number> = {}): Block[] {
  const dom = o.origin === 'domicilio'
  const extra = splitAddressNotes(o.addressNotes)
  const amounts = ownerAmounts(o, fees)
  const b: Block[] = [
    { kind: 'brand', text: 'EL TRADICIONAL' },
    { kind: 'number', text: orderId(o.num) },
    { kind: 'center', text: dateTime(o.createdAt) },
    { kind: 'banner', text: dom ? 'DOMICILIO' : 'RECOGER EN EL LOCAL' },
  ]
  if (dom) {
    if (o.zoneLabel) b.push({ kind: 'text', text: 'Barrio: ' + o.zoneLabel, bold: true })
    b.push({ kind: 'text', text: o.address, bold: true })
    if (extra.apt) b.push({ kind: 'text', text: extra.apt })
    if (extra.notes) b.push({ kind: 'text', text: 'Indicaciones: ' + extra.notes })
  }
  b.push({ kind: 'text', text: o.name + (o.phone && o.phone !== '—' ? ' · ' + o.phone : '') })
  b.push({ kind: 'rule' })
  for (const l of ticketLines(o)) {
    b.push({ kind: 'dish', text: `${l.qty}× ${l.name}` })
    if (l.detail.opts.length) b.push({ kind: 'text', text: l.detail.opts.map(cap).join(' · ') })
    if (l.detail.removed.length) b.push({ kind: 'sin', text: 'SIN ' + l.detail.removed.join(', ').toUpperCase() })
    if (l.detail.addons.length) b.push({ kind: 'text', text: '+ Adición: ' + l.detail.addons.join(', '), bold: true })
    if (l.detail.note) b.push({ kind: 'text', text: 'Nota: ' + l.detail.note, bold: true })
    b.push({ kind: 'gap' })
  }
  b.push({ kind: 'rule' })
  b.push({ kind: 'row', left: 'Total', right: fmt(amounts.total) + (amounts.delivery === null ? ' + dom.' : ''), bold: true })
  b.push({ kind: 'text', text: 'Pago: ' + o.pay })
  return b
}
