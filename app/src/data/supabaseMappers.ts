import { defaultSettings } from '../domain/catalog.ts'
import type { ChatMessage, DayId, DiscountKind, Eligibility, Order, OrderDraft, OrderLine, OrderStatus, Origin, Sender, Settings } from '../domain/types.ts'

/** Row shapes of the tables in supabase/schema.sql. */
export interface SettingsRow {
  id: number
  store_open: boolean
  plato_dia: string | null
  day_off: Record<string, boolean> | null
  sold_proteins: Record<string, boolean> | null
  sold_dishes: Record<string, boolean> | null
  juices: Settings['juices'] | null
  promos: Settings['promos'] | null
  desc_overrides: Record<string, string> | null
}

export interface OrderRow {
  num: number
  customer_id: string
  name: string
  email: string
  phone: string
  origin: string
  zone_id: string | null
  zone_label: string | null
  address: string
  address_notes: string
  items: string
  items_list: string[] | null
  lines: OrderLine[] | null
  subtotal: number
  discount: number
  discount_kind: string | null
  delivery: number
  total: number
  pay: string
  status: string
  reject_reason: string | null
  rated: boolean
  review_stars: number | null
  review_comment: string | null
  client_seen_id: number
  owner_seen_id: number
  created_at: string
}

export interface MessageRow { id: number; order_num: number; sender: string; body: string; created_at: string }

export function rowToSettings(r: SettingsRow): Settings {
  const d = defaultSettings()
  return {
    storeOpen: r.store_open,
    platoDia: (r.plato_dia as DayId | null) ?? null,
    dayOff: r.day_off ?? {},
    soldProteins: r.sold_proteins ?? {},
    soldDishes: r.sold_dishes ?? {},
    juices: r.juices ?? d.juices,
    promos: r.promos ?? d.promos,
    descOverrides: r.desc_overrides ?? {},
  }
}

const SETTINGS_COLUMNS: Record<keyof Settings, keyof SettingsRow> = {
  storeOpen: 'store_open',
  platoDia: 'plato_dia',
  dayOff: 'day_off',
  soldProteins: 'sold_proteins',
  soldDishes: 'sold_dishes',
  juices: 'juices',
  promos: 'promos',
  descOverrides: 'desc_overrides',
}

/** Only the changed columns, for `update settings set …`. */
export function settingsPatchToRow(p: Partial<Settings>): Partial<SettingsRow> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(p) as (keyof Settings)[]) out[SETTINGS_COLUMNS[k]] = p[k]
  return out as Partial<SettingsRow>
}

export const rowToMessage = (m: MessageRow): ChatMessage => ({ id: Number(m.id), from: m.sender as Sender, text: m.body, at: m.created_at })

export function rowToOrder(r: OrderRow, chat: ChatMessage[]): Order {
  return {
    num: Number(r.num),
    customerId: r.customer_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    origin: r.origin as Origin,
    zoneId: r.zone_id,
    zoneLabel: r.zone_label,
    address: r.address,
    addressNotes: r.address_notes,
    items: r.items,
    itemsList: r.items_list ?? [],
    lines: r.lines ?? [],
    subtotal: r.subtotal,
    discount: r.discount,
    discountKind: (r.discount_kind as DiscountKind | null) ?? null,
    delivery: r.delivery,
    total: r.total,
    pay: r.pay,
    createdAt: r.created_at,
    status: r.status as OrderStatus,
    rejectReason: r.reject_reason,
    rated: r.rated,
    reviewStars: r.review_stars,
    reviewComment: r.review_comment,
    clientSeenId: Number(r.client_seen_id),
    ownerSeenId: Number(r.owner_seen_id),
    chat: [...chat].sort((a, b) => a.id - b.id),
  }
}

/** The `p` argument of `place_order` (the server recomputes discount and total). */
export const draftToPayload = (d: OrderDraft) => ({
  name: d.name,
  email: d.email,
  phone: d.phone,
  origin: d.origin,
  zone_id: d.zoneId,
  zone_label: d.zoneLabel,
  address: d.address,
  address_notes: d.addressNotes,
  items: d.items,
  items_list: d.itemsList,
  lines: d.lines,
  subtotal: d.subtotal,
  delivery: d.delivery,
  pay: d.pay,
})

export function rowToEligibility(v: { rate: number | string; kind: string | null; count: number } | null): Eligibility {
  if (!v) return { rate: 0, kind: null, count: 0 }
  return { rate: Number(v.rate), kind: (v.kind as DiscountKind | null) ?? null, count: Number(v.count) }
}

/** Adds a message to an order once (realtime and RPC results can both deliver it). */
export function withMessage(o: Order, m: ChatMessage): Order {
  if (o.chat.some(x => x.id === m.id)) return o
  return { ...o, chat: [...o.chat, m].sort((a, b) => a.id - b.id) }
}

/** Newer order row wins; the chat already loaded is kept. */
export const mergeOrderRow = (prev: Order | undefined, r: OrderRow): Order => rowToOrder(r, prev?.chat ?? [])
