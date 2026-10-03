import type { DailyMenu, DayId, Dish, Juice, Opt, Promo, Settings } from './types.ts'

const slug = (x: string) => x.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()
/** Removable-ingredient list from labels (same id rule as the prototype). */
export const R = (...l: string[]): Opt[] => l.map(x => ({ id: slug(x), label: x }))

export const PROTEINS: Opt[] = [
  { id: 'res', label: 'Res' },
  { id: 'cerdo', label: 'Cerdo' },
  { id: 'pollo', label: 'Pollo' },
  { id: 'chicharron', label: 'Chicharrón' },
  { id: 'molida', label: 'Carne molida' },
]

const sopa = (id: string, label: string): Opt[] => [
  { id, label },
  { id: 'frijoles', label: 'Frijoles' },
  { id: 'sinsopa', label: 'Sin sopa' },
]

const WEEKEND_SOPAS: Opt[] = [{ id: 'frijoles', label: 'Frijoles' }, { id: 'sinsopa', label: 'Sin sopa' }]

export const DAY_ORDER: DayId[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
export const WEEKEND: DayId[] = ['sabado', 'domingo']

export const DAILY_MENUS: DailyMenu[] = [
  { day: 'lunes', label: 'Lunes', price: 20000, priceDom: 20000, drink: true,
    desc: 'Carne especial del día: sudado de pollo. Sopa campesina o de fríjoles acompañada de proteína al gusto, arroz, ensalada, papa, yuca cocinada y arepa.',
    sopas: sopa('campesina', 'Sopa campesina'),
    specialProts: [{ id: 'sudadopollo', label: 'Sudado de pollo' }], proteinChoice: true, defProt: 'sudadopollo',
    rem: R('Arroz', 'Ensalada', 'Papa', 'Yuca cocinada', 'Arepa') },
  { day: 'martes', label: 'Martes', price: 20000, priceDom: 20000, drink: true,
    desc: 'Carne especial del día: carne desmechada o sobrebarriga. Sopa de tortilla o de fríjoles acompañada de proteína al gusto, arroz, papa a la francesa, maduro y arepa.',
    sopas: sopa('tortilla', 'Sopa de tortilla'),
    specialProts: [{ id: 'desmechada', label: 'Carne desmechada' }, { id: 'sobrebarriga', label: 'Sobrebarriga' }], proteinChoice: true, defProt: 'desmechada',
    rem: R('Arroz', 'Papa a la francesa', 'Maduro', 'Arepa') },
  { day: 'miercoles', label: 'Miércoles', price: 20000, priceDom: 20000, drink: true, img: '/assets/menu-miercoles.webp',
    desc: 'Carne especial del día: albóndigas. Sopa de pastas o de fríjoles acompañada de proteína al gusto, arroz, papas a la francesa, maduro, ensalada y arepa.',
    sopas: sopa('pastas', 'Sopa de pastas'),
    specialProts: [{ id: 'albondigas', label: 'Albóndigas' }], proteinChoice: true, defProt: 'albondigas',
    rem: R('Arroz', 'Papas a la francesa', 'Maduro', 'Ensalada', 'Arepa') },
  { day: 'jueves', label: 'Jueves', price: 20000, priceDom: 20000, drink: true, img: '/assets/menu-jueves.webp',
    desc: 'Carne especial del día: posta sudada. Sopa de guineo o de fríjoles acompañada de proteína al gusto, arroz, papa y yuca cocinada, maduro, ensalada y arepa.',
    sopas: sopa('guineo', 'Sopa de guineo'),
    specialProts: [{ id: 'posta', label: 'Posta sudada' }], proteinChoice: true, defProt: 'posta',
    rem: R('Arroz', 'Papa cocinada', 'Yuca cocinada', 'Maduro', 'Ensalada', 'Arepa') },
  { day: 'viernes', label: 'Viernes', price: 20000, priceDom: 20000, drink: true, img: '/assets/menu-viernes.webp',
    desc: 'Carne especial del día: costillas. Crema de ahuyama o de fríjoles acompañada de proteína al gusto, arroz, papa criolla frita, maduro, ensalada y arepa.',
    sopas: sopa('ahuyama', 'Crema de ahuyama'),
    specialProts: [{ id: 'costilla', label: 'Costillas' }], proteinChoice: true, defProt: 'costilla',
    rem: R('Arroz', 'Papa criolla frita', 'Maduro', 'Ensalada', 'Arepa') },
  // Mondongo and sancocho are soups themselves: no soup and no protein choice. The day's soups and
  // special proteins go to the other dishes that offer them (Bandeja Especial, Cazuela…).
  { day: 'sabado', label: 'Sábado', name: 'Mondongo', soupDish: true, sopas: WEEKEND_SOPAS, proteinChoice: false,
    specialProts: [{ id: 'lengua', label: 'Lengua' }], price: 35000, priceDom: 35000, drink: true, img: '/assets/mondongo.webp',
    desc: 'Sopa de mondongo acompañada con aguacate, arroz, ensalada y arepa.', rem: R('Aguacate', 'Arroz', 'Ensalada', 'Arepa') },
  { day: 'domingo', label: 'Domingo', name: 'Sancocho trifásico', soupDish: true, sopas: WEEKEND_SOPAS, proteinChoice: false,
    specialProts: [{ id: 'sudadoposta', label: 'Sudado de posta' }], price: 35000, priceDom: 35000, drink: true, img: '/assets/sancocho.webp',
    desc: 'Arroz, aguacate, arepa y ensalada. Guandolo o jugo.', rem: R('Arroz', 'Aguacate', 'Arepa', 'Ensalada') },
]

export const EXTRAS_CAT = 'Bebidas y postres'
export const EXTRA_JUICE_IDS = ['jugoagua', 'jugoleche']
export const DESSERT_ID = 'postre'

export const MENU: Dish[] = [
  { id: 'paisa', cat: 'Especiales', name: 'Bandeja Paisa', price: 35000, tag: 'La favorita', img: '/assets/bandeja-paisa.webp', avail: true, drink: true,
    desc: 'Arroz, frijol, ensalada, papa a la francesa, maduro, chorizo, molida, chicharrón, aguacate, huevo y arepa. Guandolo o jugo.',
    rem: R('Arroz', 'Frijol', 'Ensalada', 'Papa a la francesa', 'Maduro', 'Chorizo', 'Molida', 'Chicharrón', 'Aguacate', 'Huevo', 'Arepa') },
  { id: 'especial', cat: 'Especiales', name: 'Bandeja Especial', price: 25000, tag: 'A elección', img: '/assets/bandeja-especial.webp', avail: true, soup: true, proteins: true, drink: true,
    desc: 'Sopa del día. Res, cerdo, pollo, molida o chicharrón, con arroz, papa a la francesa, maduro, aguacate, huevo, ensalada y arepa.',
    rem: R('Arroz', 'Papa a la francesa', 'Maduro', 'Aguacate', 'Huevo', 'Ensalada', 'Arepa') },
  { id: 'cazuela', cat: 'Especiales', name: 'Cazuela de Frijoles', price: 35000, img: '/assets/cazuela-2.webp', avail: true, drink: true,
    desc: 'Sopa de frijoles, maicitos, ripio de papa, platanitos, chicharrón, aguacate, chorizo, arroz y arepa.',
    rem: R('Maicitos', 'Ripio de papa', 'Platanitos', 'Chicharrón', 'Aguacate', 'Chorizo', 'Arroz', 'Arepa') },
  // Saturday's mondongo, offered on Sundays only when the owner switches it on (when there is leftover).
  { id: 'mondongo', cat: 'Especiales', name: 'Mondongo', price: 35000, tag: 'Hoy también', img: '/assets/mondongo.webp', avail: true, days: ['domingo'], optIn: true, drink: true,
    desc: 'Sopa de mondongo acompañada con aguacate, arroz, ensalada y arepa.', rem: R('Aguacate', 'Arroz', 'Ensalada', 'Arepa') },
  { id: 'lengua', cat: 'Especiales', name: 'Lengua', price: 35000, tag: 'Solo sábados', img: '/assets/menu-dia.webp', avail: true, days: ['sabado'], soup: true, drink: true,
    desc: 'Lengua acompañada de arroz, papa cocinada, yuca cocinada, ensalada, arepa y la sopa del día.',
    rem: R('Arroz', 'Papa cocinada', 'Yuca cocinada', 'Ensalada', 'Arepa') },
  { id: 'trucha', cat: 'Pescados', name: 'Trucha', price: 35000, img: '/assets/trucha.webp', avail: true, drink: true,
    desc: 'Arroz con coco, patacón, ensalada y aguacate. Sopa de pescado y guandolo.',
    rem: R('Arroz con coco', 'Patacón', 'Ensalada', 'Aguacate', 'Sopa de pescado', 'Guandolo') },
  { id: 'tilapia', cat: 'Pescados', name: 'Tilapia', price: 35000, img: '/assets/tilapia.webp', avail: true, drink: true,
    desc: 'Arroz con coco, patacón, ensalada y aguacate. Sopa de pescado y guandolo.',
    rem: R('Arroz con coco', 'Patacón', 'Ensalada', 'Aguacate', 'Sopa de pescado', 'Guandolo') },
  // Bought apart (every dish already includes a juice).
  { id: 'jugoagua', cat: EXTRAS_CAT, name: 'Jugo en agua', price: 10000, icon: '🥤', avail: true, desc: 'Jugo natural en agua, aparte del que incluye tu plato.', rem: [] },
  { id: 'jugoleche', cat: EXTRAS_CAT, name: 'Jugo en leche', price: 12000, icon: '🥛', avail: true, desc: 'Jugo natural en leche, aparte del que incluye tu plato.', rem: [] },
  { id: 'postre', cat: EXTRAS_CAT, name: 'Postre', price: 13000, icon: '🍰', avail: true, desc: 'Postre de la casa. Escoge el sabor.', rem: [],
    groups: [{ id: 'sabor', short: 'sabor', title: 'Elige el sabor', sub: 'Escoge uno', options: [] }] },
]

export const DESSERT_FLAVORS: Opt[] = [
  'Limón', 'Café', 'Tiramisú', 'Cheesecake Oreo', 'Maracuyá', 'Napoleón', 'Arequipe', 'Cheesecake Milo', 'Cheesecake Mora',
].map(label => ({ id: label.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase(), label }))

/** Paid additions offered at the end of every dish: each protein apart, plus rice and fries. */
export interface Addon { id: string; label: string; price: number }
export const proteinAddonPrice = (id: string) => (id === 'molida' ? 5000 : 10000)
export const SIDE_ADDONS: Addon[] = [
  { id: 'arroz', label: 'Arroz', price: 6000 },
  { id: 'papas', label: 'Papas a la francesa', price: 5000 },
]

export const FEATURED_IDS = ['paisa', 'especial', 'trucha']

export interface Zone { id: string; label: string; fee: number }
export const ZONES: Zone[] = [
  { id: 'magnolia', label: 'La Magnolia', fee: 0 },
  { id: 'alto_flores', label: 'Alto de las Flores', fee: 8000 },
  { id: 'cumbres', label: 'Cumbres', fee: 6000 },
  { id: 'milan', label: 'Milán', fee: 5000 },
  { id: 'cometas', label: 'Las Cometas', fee: 4000 },
  { id: 'rosellon', label: 'Rosellón', fee: 6000 },
  { id: 'castelli', label: 'Castelli', fee: 7000 },
  { id: 'obrero', label: 'El Obrero', fee: 3000 },
  { id: 'naranjos', label: 'Los Naranjos', fee: 2000 },
  { id: 'city_plaza', label: 'City Plaza', fee: 7000 },
  { id: 'primavera', label: 'Primavera', fee: 5000 },
  { id: 'san_rafael', label: 'San Rafael', fee: 7000 },
  { id: 'cuenca', label: 'Cuenca', fee: 8000 },
  { id: 'montiel', label: 'Jardines de Montiel', fee: 6000 },
  { id: 'mina', label: 'La Mina', fee: 7000 },
  { id: 'quintas_serrania', label: 'Quintas de la Serranía', fee: 5000 },
  { id: 'quintas_zuniga', label: 'Quintas de Zúñiga', fee: 4000 },
  { id: 'bosques_zuniga', label: 'Bosques de Zúñiga', fee: 5000 },
  { id: 'barrio_mesa', label: 'Barrio Mesa', fee: 5000 },
  { id: 'alcala', label: 'Alcalá', fee: 6000 },
  { id: 'viva', label: 'Viva Envigado', fee: 6000 },
  { id: 'terrazas', label: 'Terrazas del Río', fee: 5000 },
  { id: 'california', label: 'California', fee: 6000 },
  { id: 'mesa', label: 'Mesa', fee: 5000 },
  { id: 'portal', label: 'El Portal', fee: 5000 },
  { id: 'san_mateo', label: 'San Mateo', fee: 2000 },
  { id: 'camino_verde', label: 'Camino Verde', fee: 5000 },
  { id: 'viviendas_sur', label: 'Viviendas del Sur', fee: 10000 },
]

/** Barrio not in the list: the customer types it and the owner sets the fee on the order. */
export const OTHER_ZONE_ID = 'otro'

export const PAYS = [
  { id: 'efectivo', label: 'Efectivo (contra entrega)' },
  { id: 'transferencia', label: 'Nequi / Transferencia (contra entrega)' },
]

export const QUICK_REPLIES = [
  'Hola, ya recibimos tu pedido. 🙌',
  'Estamos preparando tu pedido, será enviado pronto.',
  'Tu pedido va en camino. 🛵',
  'Por favor, ten listo el pago.',
  '¿Podrías confirmarnos la dirección?',
  'Ese plato se ha agotado, ¿te ofrecemos otra opción?',
  'Gracias por elegir El Tradicional. 😋',
]

export const ONBOARDING = [
  { t: '¡Bienvenido a El Tradicional!', b: 'Soy Toño, tu guía en la app. Permíteme mostrarte cómo hacer tu pedido en pocos pasos. 👇' },
  { t: 'Explora nuestro menú', b: 'Toca la sección “Menú” para ver todos los platos disponibles hoy. La carta cambia cada día según lo que preparamos.' },
  { t: 'Personaliza tu plato', b: 'En cada plato puedes elegir tu sopa, proteína o bebida incluida, y quitar los ingredientes que prefieras.' },
  { t: 'Haz tu pedido', b: 'Cuando termines, ve al carrito y confirma. Te lo entregamos caliente y bien presentado. 🛵' },
  { t: 'Gana con tu fidelidad', b: 'Crea tu cuenta y acumula sellos: al décimo pedido obtienes un descuento especial. ¡Vale la pena!' },
]

export const DEFAULT_JUICES: Juice[] = [
  { id: 'guandolo', label: 'Guandolo', out: false },
  { id: 'jugo', label: 'Jugo', out: false },
]

export const DEFAULT_PROMOS: Promo[] = [
  { id: 'primer', title: '-20% en tu primer pedido', sub: 'Se aplica automáticamente en tu primera compra por la app.', active: true },
  { id: 'diez', title: '-20% al completar 10 pedidos', sub: 'Completa 10 pedidos y el siguiente va con -20%.', active: true },
]

export const defaultSettings = (): Settings => ({
  storeOpen: true,
  platoDia: null,
  dayOff: {},
  soldProteins: {},
  soldDishes: {},
  juices: DEFAULT_JUICES.map(j => ({ ...j })),
  promos: DEFAULT_PROMOS.map(p => ({ ...p })),
  descOverrides: {},
  daySoups: {},
  dayProteins: {},
  soldFlavors: {},
  dessertFlavors: null,
  juiceFlavors: [],
  dishOn: {},
  customDishes: [],
})

export const ORDER_NUM_START = 1043
