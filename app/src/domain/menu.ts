import { DAILY_MENUS, DAY_ORDER, MENU, PROTEINS, R, SATURDAY_PROTEINS, WEEKEND } from './catalog.ts'
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

const soupGroup = (s: Settings, day: DayId): OptionGroup[] => {
  const options = soupsFor(s, day)
  return options.length ? [{ id: 'sopa', short: 'sopa', title: 'Elige tu sopa', sub: 'Incluida · escoge una', options }] : []
}

/** The owner-selected dish of the day, shaped like any other dish (or null if none is published). */
export function dailyDish(s: Settings): Dish | null {
  const m = dailyMenuFor(s.platoDia)
  if (!m) return null
  const groups = m.soupDish ? [] : soupGroup(s, m.day)
  const protList = (m.proteins ?? []).filter(o => !isDayOff(s, m.day, 'prot', o.id))
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

/** Proteins offered by the fixed and owner-created dishes on a given day (Lengua only on Saturdays). */
export const proteinsForDay = (day: DayId): Opt[] => (day === 'sabado' ? [...PROTEINS, ...SATURDAY_PROTEINS] : PROTEINS)

/** The fixed dishes plus the ones the owner created, with that day's soups and proteins. */
export function specials(s: Settings, now = new Date()): Dish[] {
  const day = serviceDay(s, now)
  return [...MENU, ...(s.customDishes ?? []).map(customToDish)].map(d => ({
    ...d,
    desc: descOf(s, d.id, d.desc),
    groups: [...(d.soup ? soupGroup(s, day) : []), ...(d.groups ?? [])],
    ...(d.proteins ? { protList: proteinsForDay(day) } : {}),
  }))
}

/** Every dish the customer can see today: dish of the day first, then the fixed specials. */
export function allDishes(s: Settings, now = new Date()): Dish[] {
  const d = dailyDish(s)
  return [...(d ? [d] : []), ...specials(s, now)]
}

export const dishById = (s: Settings, id: string, now = new Date()): Dish | null => allDishes(s, now).find(d => d.id === id) ?? null

export const isDishSoldOut = (s: Settings, d: Dish) => !d.avail || !!s.soldDishes[d.id]

export const proteinsOf = (d: Dish): Opt[] => d.protList ?? PROTEINS

/** Menu category chips; "Menú del día" only while a weekday menu is published. */
export function categories(s: Settings): string[] {
  const d = dailyDish(s)
  return d && d.cat === 'Menú del día' ? ['Todos', 'Menú del día', 'Especiales', 'Pescados'] : ['Todos', 'Especiales', 'Pescados']
}

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
