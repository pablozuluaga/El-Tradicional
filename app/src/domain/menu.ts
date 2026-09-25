import { DAILY_MENUS, MENU, PROTEINS, WEEKEND } from './catalog.ts'
import type { DailyMenu, DayId, Dish, Opt, OptionGroup, Settings } from './types.ts'

export const DAILY_ID = 'dia'
export const DEFAULT_DAILY_IMG = '/assets/menu-dia.webp'

export const isDayOff = (s: Settings, day: DayId, kind: 'sopa' | 'prot', id: string) => !!s.dayOff[`${day}:${kind}:${id}`]
export const dayOffKey = (day: DayId, kind: 'sopa' | 'prot', id: string) => `${day}:${kind}:${id}`

export const descOf = (s: Settings, id: string, fallback: string) => {
  const o = s.descOverrides[id]
  return o !== undefined && o !== null && o !== '' ? o : fallback
}

export const dailyMenuFor = (day: DayId | null): DailyMenu | null => (day ? DAILY_MENUS.find(m => m.day === day) ?? null : null)

/** The owner-selected dish of the day, shaped like any other dish (or null if none is published). */
export function dailyDish(s: Settings): Dish | null {
  const m = dailyMenuFor(s.platoDia)
  if (!m) return null
  const groups: OptionGroup[] = []
  if (m.sopas) {
    const so = m.sopas.filter(o => !isDayOff(s, m.day, 'sopa', o.id))
    if (so.length) groups.push({ id: 'sopa', short: 'sopa', title: 'Elige tu sopa', sub: 'Incluida · escoge una', options: so })
  }
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

export const specials = (s: Settings): Dish[] => MENU.map(d => ({ ...d, desc: descOf(s, d.id, d.desc) }))

/** Every dish the customer can see today: dish of the day first, then the fixed specials. */
export function allDishes(s: Settings): Dish[] {
  const d = dailyDish(s)
  return [...(d ? [d] : []), ...specials(s)]
}

export const dishById = (s: Settings, id: string): Dish | null => allDishes(s).find(d => d.id === id) ?? null

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
