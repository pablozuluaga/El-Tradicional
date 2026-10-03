export type DayId = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export type OrderStatus = 'nuevo' | 'aceptado' | 'camino' | 'listo' | 'rechazado'
export type Origin = 'domicilio' | 'recoger'
export type Sender = 'cliente' | 'dueno'
export type DiscountKind = 'primer' | 'diez'

export interface Opt { id: string; label: string; rem?: Opt[] }

export interface OptionGroup { id: string; short: string; title: string; sub: string; options: Opt[] }

export interface Dish {
  id: string
  cat: string
  name: string
  price: number
  priceDom?: number
  tag?: string
  img?: string
  /** shown instead of a photo (juices, desserts) */
  icon?: string
  avail: boolean
  availNote?: string
  drink?: boolean
  /** only served on these days (e.g. Lengua on Saturdays); every day when missing */
  days?: DayId[]
  /** hidden until the owner switches it on (`Settings.dishOn`), e.g. leftover mondongo on Sundays */
  optIn?: boolean
  /** true when the dish comes with a soup (the day's soups, see `soupsFor`) */
  soup?: boolean
  /** true when the customer must pick a protein */
  proteins?: boolean
  /** protein list for this dish (daily menus); defaults to PROTEINS */
  protList?: Opt[]
  defProt?: string | null
  desc: string
  groups?: OptionGroup[]
  rem: Opt[]
}

export interface DailyMenu {
  day: DayId
  label: string
  name?: string
  price: number
  priceDom: number
  drink: boolean
  img?: string
  desc: string
  /** default soups for the day (the owner can change them); also offered by dishes with `soup` */
  sopas: Opt[]
  /** default special proteins of the day (the owner can add or remove them) */
  specialProts: Opt[]
  /** the dish itself is a soup (mondongo, sancocho): no soup choice */
  soupDish?: boolean
  /** weekday menus: the customer picks the protein (the day's specials first, then PROTEINS) */
  proteinChoice: boolean
  defProt?: string
  rem: Opt[]
}

/** A dish the owner created from the panel. */
export interface CustomDish {
  id: string
  name: string
  cat: 'Especiales' | 'Pescados'
  price: number
  desc: string
  soup: boolean
  proteins: boolean
  drink: boolean
  /** ingredients the customer can ask to leave out */
  rem: string[]
}

export interface Juice { id: string; label: string; out: boolean }
export interface Promo { id: string; title: string; sub: string; active: boolean }

export interface Settings {
  storeOpen: boolean
  platoDia: DayId | null
  /** keys `${day}:${kind}:${id}` → option switched off for that day */
  dayOff: Record<string, boolean>
  soldProteins: Record<string, boolean>
  soldDishes: Record<string, boolean>
  juices: Juice[]
  promos: Promo[]
  descOverrides: Record<string, string>
  /** the owner's soup list per day; a day missing here uses its default soups */
  daySoups: Partial<Record<DayId, Opt[]>>
  /** the owner's special proteins per day; a day missing here uses its defaults */
  dayProteins: Partial<Record<DayId, Opt[]>>
  /** dessert flavors switched off */
  soldFlavors: Record<string, boolean>
  /** the owner's dessert flavors; null = the default list (DESSERT_FLAVORS) */
  dessertFlavors: Opt[] | null
  /** flavors for the juices bought apart (en agua / en leche) */
  juiceFlavors: Juice[]
  /** opt-in dishes the owner switched on (see `Dish.optIn`) */
  dishOn: Record<string, boolean>
  customDishes: CustomDish[]
}

export interface CartLine {
  key: string
  dishId: string
  name: string
  cat: string
  basePrice: number
  domPrice: number
  qty: number
  opts: string[]
  proteinLabel: string | null
  juiceLabel: string | null
  note: string
  removed: string[]
  /** paid additions on the plate (already included in basePrice/domPrice) */
  addons?: string[]
}

export interface OrderLine { dishId: string; name: string; qty: number; unit: number }

export interface ChatMessage { id: number; from: Sender; text: string; at: string }

export interface Review { stars: number; comment: string }

export interface Order {
  num: number
  customerId: string
  name: string
  email: string
  phone: string
  origin: Origin
  zoneId: string | null
  zoneLabel: string | null
  address: string
  addressNotes: string
  items: string
  itemsList: string[]
  lines: OrderLine[]
  subtotal: number
  discount: number
  discountKind: DiscountKind | null
  delivery: number
  /** barrio "Otro": the owner still has to set the delivery fee */
  deliveryPending: boolean
  total: number
  pay: string
  createdAt: string
  status: OrderStatus
  rejectReason: string | null
  rated: boolean
  reviewStars: number | null
  reviewComment: string | null
  clientSeenId: number
  ownerSeenId: number
  chat: ChatMessage[]
}

export interface Eligibility { rate: number; kind: DiscountKind | null; count: number }

/** What the customer sends when placing an order (server recomputes discount/total). */
export interface OrderDraft {
  customerId: string
  name: string
  email: string
  phone: string
  origin: Origin
  zoneId: string | null
  zoneLabel: string | null
  address: string
  addressNotes: string
  items: string
  itemsList: string[]
  lines: OrderLine[]
  subtotal: number
  delivery: number
  pay: string
}
