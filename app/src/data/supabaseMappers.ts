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
  /** added later; missing until the project runs the updated schema.sql */
  day_soups?: Settings['daySoups'] | null
  custom_dishes?: Settings['customDishes'] | null
  day_proteins?: Settings['dayProteins'] | null
  sold_flavors?: Settings['soldFlavors'] | null
  dessert_flavors?: Settings['dessertFlavors']
  juice_flavors?: Settings['juiceFlavors'] | null
  dish_on?: Settings['dishOn'] | null
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
  /** added later; missing until the project runs the updated schema.sql */
  delivery_pending?: boolean | null
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

/**
 * Settings added after the first release live in one bag inside `desc_overrides` (key `__app`),
 * so new options never need a database change: saving them is like saving a juice. Projects that
 * ran a newer schema.sql may also have them as columns; the bag wins, the column is the fallback.
 */
export const BAG_KEY = '__app'
const BAG_FIELDS = ['daySoups', 'dayProteins', 'soldFlavors', 'dessertFlavors', 'juiceFlavors', 'dishOn', 'customDishes', 'deliveryFees', 'priceOverrides'] as const
type BagField = typeof BAG_FIELDS[number]
const isBagField = (k: string): k is BagField => (BAG_FIELDS as readonly string[]).includes(k)

export function rowToSettings(r: SettingsRow): Settings {
  const d = defaultSettings()
  const { [BAG_KEY]: rawBag, ...desc } = (r.desc_overrides ?? {}) as Record<string, unknown>
  const bag = (rawBag && typeof rawBag === 'object' ? rawBag : {}) as Partial<Pick<Settings, BagField>>
  return {
    storeOpen: r.store_open,
    platoDia: (r.plato_dia as DayId | null) ?? null,
    dayOff: r.day_off ?? {},
    soldProteins: r.sold_proteins ?? {},
    soldDishes: r.sold_dishes ?? {},
    juices: r.juices ?? d.juices,
    promos: r.promos ?? d.promos,
    descOverrides: desc as Record<string, string>,
    daySoups: bag.daySoups ?? r.day_soups ?? {},
    dayProteins: bag.dayProteins ?? r.day_proteins ?? {},
    soldFlavors: bag.soldFlavors ?? r.sold_flavors ?? {},
    dessertFlavors: bag.dessertFlavors !== undefined ? bag.dessertFlavors : (r.dessert_flavors ?? null),
    juiceFlavors: bag.juiceFlavors ?? r.juice_flavors ?? [],
    dishOn: bag.dishOn ?? r.dish_on ?? {},
    customDishes: bag.customDishes ?? r.custom_dishes ?? [],
    deliveryFees: bag.deliveryFees ?? {},
    priceOverrides: bag.priceOverrides ?? {},
  }
}

const SETTINGS_COLUMNS: Record<Exclude<keyof Settings, BagField>, keyof SettingsRow> = {
  storeOpen: 'store_open',
  platoDia: 'plato_dia',
  dayOff: 'day_off',
  soldProteins: 'sold_proteins',
  soldDishes: 'sold_dishes',
  juices: 'juices',
  promos: 'promos',
  descOverrides: 'desc_overrides',
}

/**
 * Only the changed columns, for `update settings set …`. `next` is the full settings after the
 * change: descriptions and the bag share `desc_overrides`, so that column is written whole.
 */
export function settingsPatchToRow(p: Partial<Settings>, next: Settings): Partial<SettingsRow> {
  const out: Record<string, unknown> = {}
  let descColumn = false
  for (const k of Object.keys(p) as (keyof Settings)[]) {
    if (isBagField(k) || k === 'descOverrides') descColumn = true
    else out[SETTINGS_COLUMNS[k]] = p[k]
  }
  if (descColumn) {
    const bag = Object.fromEntries(BAG_FIELDS.map(f => [f, next[f]]))
    out.desc_overrides = { ...next.descOverrides, [BAG_KEY]: bag }
  }
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
    deliveryPending: !!r.delivery_pending,
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
