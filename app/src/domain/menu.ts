import { DAILY_MENUS, DAY_ORDER, DESSERT_FLAVORS, DESSERT_ID, EXTRA_JUICE_IDS, EXTRAS_CAT, MENU, PROTEINS, proteinAddonPrice, R, SIDE_ADDONS, WEEKEND, type Addon } from './catalog.ts'
import type { CustomDish, DailyMenu, DayId, Dish, Opt, OptionGroup, Settings } from './types.ts'

export const DAILY_ID = 'dia'
export const DEFAULT_DAILY_IMG = '/assets/menu-dia.webp'

export const isDayOff = (s: Settings, day: DayId, kind: 'sopa' | 'prot', id: string) => !!s.dayOff[`${day}:${kind}:${id}`]
export const dayOffKey = (day: DayId, kind: 'sopa' | 'prot', id: string) => `${day}:${kind}:${id}`

export const descOf = (s: Settings, id: string, fallback: string) => {
  const o = s.descOverrides[id]
  return o !== undefined && o !== null && o !== '' ? o : fallback
}

export const dailyMenuFor = (day: DayId | null): DailyMenu | null => (day ? DAILY_MENUS.find(m => m.day === day) ?? null : null)

/** Weekday in Colombia (UTC-5 all year). */
export const bogotaDay = (now: Date): DayId => DAY_ORDER[(new Date(now.getTime() - 5 * 3600_000).getUTCDay() + 6) % 7]

/** The day the kitchen is serving: the published menu's day, or today's date when none is published. */
export const serviceDay = (s: Settings, now = new Date()): DayId => s.platoDia ?? bogotaDay(now)

/** The day's soup list as the owner left it (including the ones switched off). */
export const daySoupList = (s: Settings, day: DayId): Opt[] => s.daySoups?.[day] ?? dailyMenuFor(day)?.sopas ?? []

/** The soups a customer can pick that day. */
export const soupsFor = (s: Settings, day: DayId): Opt[] => daySoupList(s, day).filter(o => !isDayOff(s, day, 'sopa', o.id))

/** The day's special proteins as the owner left them (including the ones switched off). */
export const dayProteinList = (s: Settings, day: DayId): Opt[] => s.dayProteins?.[day] ?? dailyMenuFor(day)?.specialProts ?? []

/** The day's special proteins a customer can pick. */
export const specialProteinsFor = (s: Settings, day: DayId): Opt[] => dayProteinList(s, day).filter(o => !isDayOff(s, day, 'prot', o.id))

/** True when that day's menu del día carries the protein choice (weekdays); otherwise the day's
 *  special proteins go to the other dishes with a protein choice (weekends: lengua, sudado de posta). */
const menuHasProteins = (day: DayId) => !!dailyMenuFor(day)?.proteinChoice

const soupGroup = (s: Settings, day: DayId): OptionGroup[] => {
  const options = soupsFor(s, day)
  return options.length ? [{ id: 'sopa', short: 'sopa', title: 'Elige tu sopa', sub: 'Incluida · escoge una', options }] : []
}

/** The owner-selected dish of the day, shaped like any other dish (or null if none is published). */
export function dailyDish(s: Settings): Dish | null {
  const m = dailyMenuFor(s.platoDia)
  if (!m) return null
  const groups = m.soupDish ? [] : soupGroup(s, m.day)
  const protList = m.proteinChoice
    ? [...specialProteinsFor(s, m.day), ...PROTEINS.filter(o => !isDayOff(s, m.day, 'prot', o.id))]
    : []
  const defProt = protList.some(x => x.id === m.defProt) ? m.defProt! : (protList[0]?.id ?? null)
  const weekend = WEEKEND.includes(m.day)
  return {
    id: DAILY_ID,
    cat: weekend ? 'Especiales' : 'Menú del día',
    name: m.name ?? 'Menú del día',
    price: m.price,
    priceDom: m.priceDom,
    tag: 'Hoy · ' + m.label,
    img: m.img ?? DEFAULT_DAILY_IMG,
    avail: true,
    drink: m.drink,
    proteins: protList.length > 0,
    protList,
    defProt,
    desc: descOf(s, m.day, m.desc),
    groups,
    rem: m.rem,
  }
}

export const DEFAULT_CUSTOM_IMG = '/assets/menu-dia.webp'

const customToDish = (c: CustomDish): Dish => ({
  id: c.id, cat: c.cat, name: c.name, price: c.price, img: DEFAULT_CUSTOM_IMG, avail: true,
  soup: c.soup, proteins: c.proteins, drink: c.drink, desc: c.desc, rem: R(...c.rem),
})

/** Proteins offered by the fixed and owner-created dishes on a given day. */
export const proteinsForDay = (s: Settings, day: DayId): Opt[] =>
  menuHasProteins(day) ? PROTEINS : [...PROTEINS, ...specialProteinsFor(s, day)]

/** The dessert flavors as the owner left them (including the ones switched off). */
export const dessertFlavorList = (s: Settings): Opt[] => s.dessertFlavors ?? DESSERT_FLAVORS

/** Dessert flavors the customer can pick now. */
export const flavorsFor = (s: Settings): Opt[] => dessertFlavorList(s).filter(f => !s.soldFlavors?.[f.id])

/** Juice flavors (for the juices bought apart) the customer can pick now. */
export const juiceFlavorsFor = (s: Settings): Opt[] => (s.juiceFlavors ?? []).filter(j => !j.out).map(({ id, label }) => ({ id, label }))

const flavorGroup = (options: Opt[]): OptionGroup => ({ id: 'sabor', short: 'sabor', title: 'Elige el sabor', sub: 'Escoge uno', options })

/** Desserts always ask the flavor; the juices apart only once the owner has created flavors. */
function flavorGroups(s: Settings, d: Dish): OptionGroup[] {
  if (d.id === DESSERT_ID) return [flavorGroup(flavorsFor(s))]
  if (EXTRA_JUICE_IDS.includes(d.id)) return (s.juiceFlavors ?? []).length ? [flavorGroup(juiceFlavorsFor(s))] : []
  return d.groups ?? []
}

/**
 * The fixed dishes plus the ones the owner created, with that day's soups and proteins.
 * Dishes limited to other days (Lengua on Saturdays) are left out unless `allDays` (owner panel).
 */
export function specials(s: Settings, now = new Date(), allDays = false): Dish[] {
  const day = serviceDay(s, now)
  return [...MENU, ...(s.customDishes ?? []).map(customToDish)]
    .filter(d => allDays || ((!d.days || d.days.includes(day)) && (!d.optIn || !!s.dishOn?.[d.id])))
    .map(d => ({
      ...d,
      desc: descOf(s, d.id, d.desc),
      groups: [...(d.soup ? soupGroup(s, day) : []), ...flavorGroups(s, d)],
      ...(d.proteins ? { protList: proteinsForDay(s, day) } : {}),
    }))
}

/** Every dish the customer can see today: dish of the day first, then the fixed specials. */
export function allDishes(s: Settings, now = new Date()): Dish[] {
  const d = dailyDish(s)
  return [...(d ? [d] : []), ...specials(s, now)]
}

export const dishById = (s: Settings, id: string, now = new Date()): Dish | null => allDishes(s, now).find(d => d.id === id) ?? null

/** Off when the owner switched it off, or when a required choice has nothing left (all dessert flavors off). */
export const isDishSoldOut = (s: Settings, d: Dish) => !d.avail || !!s.soldDishes[d.id] || (d.groups ?? []).some(g => g.options.length === 0)

export const proteinsOf = (d: Dish): Opt[] => d.protList ?? PROTEINS

/** Menu category chips; "Menú del día" only while a weekday menu is published. */
export function categories(s: Settings): string[] {
  const d = dailyDish(s)
  return d && d.cat === 'Menú del día'
    ? ['Todos', 'Menú del día', 'Especiales', 'Pescados', EXTRAS_CAT]
    : ['Todos', 'Especiales', 'Pescados', EXTRAS_CAT]
}

/** Additions the customer can add to a plate now (sold-out proteins left out). */
export const addonsFor = (s: Settings): Addon[] => [
  ...PROTEINS.filter(p => !s.soldProteins[p.id]).map(p => ({ id: 'prot-' + p.id, label: p.label, price: proteinAddonPrice(p.id) })),
  ...SIDE_ADDONS,
]

/** Juices and desserts sold apart (not a main dish). */
export const isExtra = (d: Pick<Dish, 'cat'>) => d.cat === EXTRAS_CAT

/** Removable items; a group option may carry its own list (kept from the prototype). */
export function effRem(d: Dish, choices: Record<string, string>): Opt[] {
  for (const g of d.groups ?? []) {
    if (g.options.some(o => o.rem)) {
      const o = g.options.find(x => x.id === choices[g.id])
      return o?.rem ?? []
    }
  }
  return d.rem
}

/** Default protein to preselect when opening a dish (skips sold-out ones). */
export function initialProtein(s: Settings, d: Dish): string | null {
  if (!d.proteins || !d.defProt) return null
  return s.soldProteins[d.defProt] ? null : d.defProt
}
