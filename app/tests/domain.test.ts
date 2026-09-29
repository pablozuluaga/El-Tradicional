import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultSettings } from '../src/domain/catalog.ts'
import { allDishes, bogotaDay, categories, dailyDish, dayOffKey, dishById, effRem, initialProtein, isDishSoldOut, serviceDay } from '../src/domain/menu.ts'
import { deliveryFee, discountFor, orderTotal, subtotal } from '../src/domain/pricing.ts'
import { eligibility, eligibilityFromCount, loyaltyCard, profileStats } from '../src/domain/loyalty.ts'
import { advanceLabel, advanceStep, canReject, clientSteps, hasUnread, itemsDetail, itemsSummary } from '../src/domain/orders.ts'
import { reportRows } from '../src/domain/report.ts'
import { fmt } from '../src/domain/format.ts'
import type { CartLine } from '../src/domain/types.ts'
import { mkOrder } from './helpers.ts'

test('fmt uses Colombian thousands separator', () => {
  assert.equal(fmt(20000), '$20.000')
  assert.equal(fmt(1234567.4), '$1.234.567')
})

test('no dish of the day until the owner picks one', () => {
  const s = defaultSettings()
  assert.equal(dailyDish(s), null)
  const lunes = new Date('2026-09-28T17:00:00Z')
  assert.deepEqual(allDishes(s, lunes).map(d => d.id), ['paisa', 'especial', 'cazuela', 'trucha', 'tilapia', 'jugoagua', 'jugoleche', 'postre'])
  assert.deepEqual(categories(s), ['Todos', 'Especiales', 'Pescados', 'Bebidas y postres'])
})

test('weekday menu: unnamed, sopas + sin sopa, default protein, day toggles', () => {
  const s = { ...defaultSettings(), platoDia: 'lunes' as const }
  const d = dailyDish(s)!
  assert.equal(d.name, 'Menú del día')
  assert.equal(d.cat, 'Menú del día')
  assert.equal(d.tag, 'Hoy · Lunes')
  assert.equal(d.price, 20000)
  assert.deepEqual(d.groups![0].options.map(o => o.label), ['Sopa campesina', 'Frijoles', 'Sin sopa'])
  assert.equal(d.defProt, 'sudadopollo')
  assert.deepEqual(d.protList!.map(p => p.id), ['sudadopollo', 'res', 'cerdo', 'pollo', 'chicharron', 'molida'])
  assert.deepEqual(categories(s), ['Todos', 'Menú del día', 'Especiales', 'Pescados', 'Bebidas y postres'])
  // owner switches off the soup and the default protein
  s.dayOff = { [dayOffKey('lunes', 'sopa', 'campesina')]: true, [dayOffKey('lunes', 'prot', 'sudadopollo')]: true }
  const d2 = dailyDish(s)!
  assert.deepEqual(d2.groups![0].options.map(o => o.id), ['frijoles', 'sinsopa'])
  assert.equal(d2.defProt, 'res')
})

test('martes puts desmechada and sobrebarriga first; every day includes the juice', () => {
  const m = dailyDish({ ...defaultSettings(), platoDia: 'martes' })!
  assert.deepEqual(m.protList!.slice(0, 2).map(p => p.label), ['Carne desmechada', 'Sobrebarriga'])
  assert.equal(m.drink, true)
  assert.equal(dailyDish({ ...defaultSettings(), platoDia: 'viernes' })!.drink, true)
  assert.match(m.desc, /^Carne especial del día: carne desmechada o sobrebarriga\./)
})

test('weekend dishes keep their names, go under Especiales, no protein choice', () => {
  const s = { ...defaultSettings(), platoDia: 'sabado' as const }
  const d = dailyDish(s)!
  assert.equal(d.name, 'Mondongo')
  assert.equal(d.cat, 'Especiales')
  assert.equal(d.proteins, false)
  assert.equal(d.price, 35000)
  assert.deepEqual(categories(s), ['Todos', 'Especiales', 'Pescados', 'Bebidas y postres'])
  assert.equal(dailyDish({ ...defaultSettings(), platoDia: 'domingo' })!.name, 'Sancocho trifásico')
})

test('description overrides apply to specials and daily menus', () => {
  const s = { ...defaultSettings(), platoDia: 'lunes' as const, descOverrides: { paisa: 'Nueva', lunes: 'Otra' } }
  assert.equal(dishById(s, 'paisa')!.desc, 'Nueva')
  assert.equal(dishById(s, 'dia')!.desc, 'Otra')
})

test('sold-out default protein is not preselected', () => {
  const s = { ...defaultSettings(), platoDia: 'viernes' as const }
  const d = dailyDish(s)!
  assert.equal(initialProtein(s, d), 'costilla')
  assert.equal(initialProtein({ ...s, soldProteins: { costilla: true } }, d), null)
  assert.equal(initialProtein(s, dishById(s, 'especial')!), null)
})

test('effRem returns the dish removable list', () => {
  const s = defaultSettings()
  assert.deepEqual(effRem(dishById(s, 'especial')!, {}).map(r => r.label), ['Arroz', 'Papa a la francesa', 'Maduro', 'Aguacate', 'Huevo', 'Ensalada', 'Arepa'])
})

test('only the fish, Bandeja Paisa and Cazuela come without soup; nothing asks ensalada o arepa', () => {
  const s = { ...defaultSettings(), platoDia: 'martes' as const }
  const soupOf = (id: string) => dishById(s, id)!.groups!.find(g => g.id === 'sopa')?.options.map(o => o.label) ?? null
  assert.deepEqual(soupOf('especial'), ['Sopa de tortilla', 'Frijoles', 'Sin sopa'])
  assert.deepEqual(soupOf('dia'), ['Sopa de tortilla', 'Frijoles', 'Sin sopa'])
  for (const id of ['paisa', 'cazuela', 'trucha', 'tilapia']) assert.equal(soupOf(id), null, id)
  assert.ok(allDishes(s).every(d => (d.groups ?? []).every(g => g.id === 'sopa' || (d.id === 'postre' && g.id === 'sabor'))))
  assert.ok(allDishes(s).filter(d => d.cat !== 'Bebidas y postres').every(d => d.drink), 'every dish includes the juice')
  const caz = dishById(s, 'cazuela')!
  assert.equal(caz.price, 35000)
  assert.equal(caz.proteins, true)
})

test('owner soups: a day uses its own list, new soups and switched-off ones apply to every soup dish', () => {
  const s = { ...defaultSettings(), platoDia: 'lunes' as const,
    daySoups: { lunes: [{ id: 'campesina', label: 'Sopa campesina' }, { id: 'sopa1', label: 'Sopa de lentejas' }] },
    dayOff: { [dayOffKey('lunes', 'sopa', 'campesina')]: true } }
  assert.deepEqual(dishById(s, 'especial')!.groups![0].options.map(o => o.label), ['Sopa de lentejas'])
  assert.deepEqual(dishById(s, 'dia')!.groups![0].options.map(o => o.label), ['Sopa de lentejas'])
  // weekend dishes are soups: no soup choice for them, but Bandeja Especial still has one
  const sab = { ...defaultSettings(), platoDia: 'sabado' as const }
  assert.equal(dishById(sab, 'dia')!.groups!.length, 0)
  assert.deepEqual(dishById(sab, 'especial')!.groups![0].options.map(o => o.id), ['frijoles', 'sinsopa'])
})

test('with no published menu, soup dishes use today (Colombia time)', () => {
  const s = defaultSettings()
  // 2026-09-29 03:00 UTC is still Monday 28 in Bogotá
  const now = new Date('2026-09-29T03:00:00Z')
  assert.equal(bogotaDay(now), 'lunes')
  assert.equal(serviceDay(s, now), 'lunes')
  assert.equal(dishById(s, 'especial', now)!.groups![0].options[0].label, 'Sopa campesina')
})

test('Lengua is offered only on Saturdays; Friday brings costilla', () => {
  const prots = (day: 'sabado' | 'lunes') => dishById({ ...defaultSettings(), platoDia: day }, 'especial')!.protList!.map(p => p.id)
  assert.ok(prots('sabado').includes('lengua'))
  assert.ok(!prots('lunes').includes('lengua'))
  assert.equal(dishById({ ...defaultSettings(), platoDia: 'sabado' }, 'trucha')!.protList, undefined)
  assert.equal(dailyDish({ ...defaultSettings(), platoDia: 'viernes' })!.protList![0].label, 'Costillas')
})

test('owner-created dishes join the menu with their options and can be sold out', () => {
  const s = { ...defaultSettings(), platoDia: 'jueves' as const,
    customDishes: [{ id: 'plato1', name: 'Lomo', cat: 'Especiales' as const, price: 30000, desc: 'Lomo', soup: true, proteins: false, drink: true, rem: ['Arroz', 'Papa'] }] }
  const d = dishById(s, 'plato1')!
  assert.equal(d.price, 30000)
  assert.equal(d.drink, true)
  assert.equal(d.proteins, false)
  assert.equal(d.groups![0].options[0].label, 'Sopa de guineo')
  assert.deepEqual(d.rem.map(r => r.label), ['Arroz', 'Papa'])
  assert.equal(isDishSoldOut({ ...s, soldDishes: { plato1: true } }, d), true)
})

const line = (p: Partial<CartLine> = {}): CartLine => ({
  key: 'k', dishId: 'paisa', name: 'Bandeja Paisa', cat: 'Especiales', basePrice: 35000, domPrice: 35000, qty: 1,
  opts: [], proteinLabel: 'Res', juiceLabel: 'Jugo', note: '', removed: [], ...p,
})

test('pricing: zone fee replaces delivery, pickup is free', () => {
  const cart = [line({ qty: 2 }), line({ dishId: 'dia', name: 'Menú del día', basePrice: 20000, domPrice: 20000 })]
  assert.equal(subtotal(cart, 'domicilio'), 90000)
  assert.equal(deliveryFee('domicilio', 'alto_flores'), 8000)
  assert.equal(deliveryFee('domicilio', 'magnolia'), 0)
  assert.equal(deliveryFee('recoger', 'alto_flores'), 0)
  assert.equal(deliveryFee('domicilio', null), 0)
  assert.equal(orderTotal(90000, discountFor(90000, 0.2), 8000), 80000)
})

test('item strings match the prototype', () => {
  const cart = [line({ qty: 2, opts: ['Ensalada'], removed: ['Arepa', 'Huevo'], note: 'bien caliente' })]
  assert.equal(itemsSummary(cart), '2 Bandeja Paisa (Res, jugo, ensalada, sin arepa, huevo)')
  assert.deepEqual(itemsDetail(cart), ['2× Bandeja Paisa — res, jugo, ensalada, sin arepa, huevo, nota: bien caliente'])
})

test('loyalty: 20% on orders #1 and #11; rejected orders do not count; welcome is once per email', () => {
  assert.deepEqual(eligibility([], 'dev-a', 'ana@example.com'), { rate: 0.2, kind: 'primer', count: 0 })
  const nine = Array.from({ length: 9 }, () => mkOrder())
  assert.equal(eligibility(nine, 'dev-a', '').rate, 0)
  const ten = [...nine, mkOrder()]
  assert.deepEqual(eligibility(ten, 'dev-a', ''), { rate: 0.2, kind: 'diez', count: 10 })
  const rejected = [...nine, mkOrder({ status: 'rechazado' })]
  assert.equal(eligibility(rejected, 'dev-a', '').count, 9)
  // a new device with the same email does not get the welcome discount again
  assert.deepEqual(eligibility([mkOrder()], 'dev-b', 'ANA@example.com '), { rate: 0, kind: null, count: 0 })
  assert.equal(eligibility([mkOrder()], 'dev-b', 'otra@example.com').rate, 0.2)
  assert.equal(eligibility([mkOrder({ status: 'rechazado' })], 'dev-b', 'ana@example.com').rate, 0.2)
  // other devices never count toward this device's stamps
  assert.equal(eligibility(ten, 'dev-b', 'ana@example.com').count, 0)
})

test('loyalty card and profile stats', () => {
  assert.equal(loyaltyCard(eligibilityFromCount(0)).title, '¡Tienes -20% de bienvenida!')
  const c = loyaltyCard(eligibilityFromCount(3))
  assert.equal(c.stamps.filter(Boolean).length, 3)
  assert.equal(c.label, 'Vas por 3 de 10 · a los 10 ganas -20%')
  assert.equal(loyaltyCard(eligibilityFromCount(10)).title, '¡Ganaste -20% por tus 10 pedidos!')
  const st = profileStats([
    mkOrder(), mkOrder({ lines: [{ dishId: 'trucha', name: 'Trucha', qty: 3, unit: 35000 }] }),
    mkOrder({ status: 'rechazado', lines: [{ dishId: 'tilapia', name: 'Tilapia', qty: 9, unit: 1 }] }),
  ])
  assert.deepEqual(st, { pedidos: 2, favorito: 'Trucha' })
  assert.deepEqual(profileStats([]), { pedidos: 0, favorito: '—' })
})

test('order flow for delivery and pickup', () => {
  assert.deepEqual(advanceStep({ status: 'nuevo', origin: 'domicilio' })!.status, 'aceptado')
  assert.equal(advanceStep({ status: 'aceptado', origin: 'domicilio' })!.note, 'Tu pedido está en camino. 🛵')
  assert.equal(advanceStep({ status: 'aceptado', origin: 'recoger' })!.note, 'Tu pedido está listo para recoger en el local. 🥡')
  assert.equal(advanceStep({ status: 'camino', origin: 'recoger' })!.status, 'listo')
  assert.equal(advanceStep({ status: 'listo', origin: 'recoger' }), null)
  assert.equal(advanceStep({ status: 'rechazado', origin: 'recoger' }), null)
  assert.equal(advanceLabel({ status: 'aceptado', origin: 'recoger' }), 'Marcar listo para recoger')
  assert.equal(advanceLabel({ status: 'listo', origin: 'recoger' }), null)
  assert.equal(canReject('aceptado'), true)
  assert.equal(canReject('camino'), false)
  assert.equal(clientSteps('recoger')[2], 'Listo para recoger')
})

test('unread uses per-side seen counters', () => {
  const o = mkOrder({ chat: [
    { id: 1, from: 'dueno', text: 'hola', at: '' },
    { id: 2, from: 'cliente', text: 'gracias', at: '' },
  ], clientSeenId: 2, ownerSeenId: 1 })
  assert.equal(hasUnread(o, 'dueno'), true)
  assert.equal(hasUnread(o, 'cliente'), false)
  assert.equal(hasUnread({ ...o, ownerSeenId: 2 }, 'dueno'), false)
})

test('report rows: date range, rejected excluded, value = subtotal - discount', () => {
  const rows = reportRows([
    mkOrder({ num: 1, createdAt: new Date(2026, 8, 20, 12).toISOString(), subtotal: 35000, discount: 7000 }),
    mkOrder({ num: 2, createdAt: new Date(2026, 8, 21, 12).toISOString(), status: 'rechazado' }),
    mkOrder({ num: 3, createdAt: new Date(2026, 8, 22, 23, 30).toISOString(), phone: '3001234567' }),
    mkOrder({ num: 4, createdAt: new Date(2026, 8, 23, 0, 30).toISOString() }),
  ], '2026-09-20', '2026-09-22')
  assert.deepEqual(rows.map(r => r.numero), [1, 3])
  assert.equal(rows[0].valorPlato, 28000)
  assert.equal(rows[0].celular, '')
  assert.equal(rows[1].celular, '3001234567')
  assert.equal(reportRows([mkOrder()], '', '').length, 1)
})

test('an order with a dish the owner deleted is refused', async () => {
  const { validateDraft } = await import('../src/domain/placement.ts')
  const draft = { customerId: 'c', name: 'Ana', email: 'a@b.co', phone: '', origin: 'recoger' as const, zoneId: null, zoneLabel: null,
    address: '', addressNotes: '', items: '1x Lomo', itemsList: ['1x Lomo'], lines: [{ dishId: 'plato1', name: 'Lomo', qty: 1, unit: 30000 }], subtotal: 30000, delivery: 0, pay: 'efectivo' }
  assert.match(validateDraft(draft, defaultSettings())!, /Lomo ya no está en el menú/)
  assert.equal(validateDraft({ ...draft, lines: [{ dishId: 'paisa', name: 'Bandeja Paisa', qty: 1, unit: 35000 }] }, defaultSettings()), null)
})

test('Sunday offers sudado de posta in the protein dishes; owner-added special proteins apply to their day', () => {
  const dom = { ...defaultSettings(), platoDia: 'domingo' as const }
  assert.ok(dishById(dom, 'especial')!.protList!.some(p => p.label === 'Sudado de posta'))
  assert.ok(dishById(dom, 'cazuela')!.protList!.some(p => p.label === 'Sudado de posta'))
  // weekday specials stay in the menu del día only
  const mie = { ...defaultSettings(), platoDia: 'miercoles' as const, dayProteins: { miercoles: [{ id: 'albondigas', label: 'Albóndigas' }, { id: 'prot1', label: 'Lomo' }] } }
  assert.deepEqual(dailyDish(mie)!.protList!.slice(0, 2).map(p => p.label), ['Albóndigas', 'Lomo'])
  assert.ok(!dishById(mie, 'especial')!.protList!.some(p => p.label === 'Lomo'))
  // switched off
  const off = { ...mie, dayOff: { [dayOffKey('miercoles', 'prot', 'prot1')]: true } }
  assert.ok(!dailyDish(off)!.protList!.some(p => p.label === 'Lomo'))
})

test('Lengua is a Saturday-only dish with the day soup; desserts follow the owner flavor switches', () => {
  const sab = { ...defaultSettings(), platoDia: 'sabado' as const }
  const l = dishById(sab, 'lengua')!
  assert.equal(l.groups![0].id, 'sopa')
  assert.deepEqual(l.rem.map(r => r.label), ['Arroz', 'Papa cocinada', 'Yuca cocinada', 'Ensalada', 'Arepa'])
  assert.equal(dishById({ ...defaultSettings(), platoDia: 'lunes' }, 'lengua'), null)
  const postre = dishById(sab, 'postre')!
  assert.equal(postre.price, 13000)
  assert.equal(postre.groups![0].options.length, 9)
  const noLimon = { ...sab, soldFlavors: { limon: true } }
  assert.ok(!dishById(noLimon, 'postre')!.groups![0].options.some(o => o.id === 'limon'))
  const none = { ...sab, soldFlavors: Object.fromEntries(dishById(sab, 'postre')!.groups![0].options.map(o => [o.id, true])) }
  assert.equal(isDishSoldOut(none, dishById(none, 'postre')!), true, 'no flavors left → sold out')
  assert.equal(dishById(sab, 'jugoagua')!.price, 10000)
  assert.equal(dishById(sab, 'jugoleche')!.price, 12000)
})

test('barrio Otro: fee waits for the owner; Viviendas del Sur costs 10.000', async () => {
  const { deliveryFee, isOtherZone } = await import('../src/domain/pricing.ts')
  const { deliveryFeeNote } = await import('../src/domain/orders.ts')
  assert.equal(deliveryFee('domicilio', 'viviendas_sur'), 10000)
  assert.equal(deliveryFee('domicilio', 'otro'), 0)
  assert.equal(isOtherZone('domicilio', 'otro'), true)
  assert.equal(isOtherZone('recoger', 'otro'), false)
  assert.equal(deliveryFeeNote('La Paz', 9000, 44000), 'El domicilio a La Paz cuesta $9.000. El total de tu pedido queda en $44.000.')
  const { validateDraft } = await import('../src/domain/placement.ts')
  const draft = { customerId: 'c', name: 'Ana', email: 'a@b.co', phone: '', origin: 'domicilio' as const, zoneId: 'otro', zoneLabel: ' ',
    address: 'Calle 1', addressNotes: '', items: '1 Paisa', itemsList: ['1× Paisa'], lines: [{ dishId: 'paisa', name: 'Bandeja Paisa', qty: 1, unit: 35000 }], subtotal: 35000, delivery: 0, pay: 'efectivo' }
  assert.equal(validateDraft(draft, defaultSettings()), 'Escribe el nombre de tu barrio.')
  assert.equal(validateDraft({ ...draft, zoneLabel: 'La Paz' }, defaultSettings()), null)
})
