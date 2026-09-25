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

export const DAY_ORDER: DayId[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
export const WEEKEND: DayId[] = ['sabado', 'domingo']

export const DAILY_MENUS: DailyMenu[] = [
  { day: 'lunes', label: 'Lunes', price: 20000, priceDom: 20000, drink: true,
    desc: 'Sopa campesina o de fríjoles acompañada de proteína al gusto, arroz, ensalada, papa, yuca cocinada y arepa.',
    sopas: sopa('campesina', 'Sopa campesina'),
    proteins: [{ id: 'sudadopollo', label: 'Sudado de pollo' }, ...PROTEINS], defProt: 'sudadopollo',
    rem: R('Arroz', 'Ensalada', 'Papa', 'Yuca cocinada', 'Arepa') },
  { day: 'martes', label: 'Martes', price: 20000, priceDom: 20000, drink: true,
    desc: 'Sopa de tortilla o de fríjoles acompañada de proteína al gusto, arroz, papa a la francesa, maduro y arepa.',
    sopas: sopa('tortilla', 'Sopa de tortilla'),
    proteins: [{ id: 'desmechada', label: 'Carne desmechada' }, { id: 'sobrebarriga', label: 'Sobrebarriga' }, ...PROTEINS], defProt: 'desmechada',
    rem: R('Arroz', 'Papa a la francesa', 'Maduro', 'Arepa') },
  { day: 'miercoles', label: 'Miércoles', price: 20000, priceDom: 20000, drink: true, img: '/assets/menu-miercoles.webp',
    desc: 'Sopa de pastas o de fríjoles acompañada de proteína al gusto, arroz, papas a la francesa, maduro, ensalada y arepa.',
    sopas: sopa('pastas', 'Sopa de pastas'),
    proteins: [{ id: 'albondigas', label: 'Albóndigas' }, ...PROTEINS], defProt: 'albondigas',
    rem: R('Arroz', 'Papas a la francesa', 'Maduro', 'Ensalada', 'Arepa') },
  { day: 'jueves', label: 'Jueves', price: 20000, priceDom: 20000, drink: true, img: '/assets/menu-jueves.webp',
    desc: 'Sopa de guineo o de fríjoles acompañada de proteína al gusto, arroz, papa y yuca cocinada, maduro, ensalada y arepa.',
    sopas: sopa('guineo', 'Sopa de guineo'),
    proteins: [{ id: 'posta', label: 'Posta sudada' }, ...PROTEINS], defProt: 'posta',
    rem: R('Arroz', 'Papa cocinada', 'Yuca cocinada', 'Maduro', 'Ensalada', 'Arepa') },
  { day: 'viernes', label: 'Viernes', price: 20000, priceDom: 20000, drink: false,
    desc: 'Crema de ahuyama o de fríjoles acompañada de proteína al gusto, arroz, papa criolla frita, maduro, ensalada y arepa.',
    sopas: sopa('ahuyama', 'Crema de ahuyama'),
    proteins: [...PROTEINS], defProt: 'res',
    rem: R('Arroz', 'Papa criolla frita', 'Maduro', 'Ensalada', 'Arepa') },
  { day: 'sabado', label: 'Sábado', name: 'Mondongo', price: 35000, priceDom: 35000, drink: true, img: '/assets/mondongo.webp',
    desc: 'Arroz, aguacate, banano, arepa y ensalada. Guandolo o jugo.', rem: R('Arroz', 'Aguacate', 'Banano', 'Arepa', 'Ensalada') },
  { day: 'domingo', label: 'Domingo', name: 'Sancocho trifásico', price: 35000, priceDom: 35000, drink: true, img: '/assets/sancocho.webp',
    desc: 'Arroz, aguacate, arepa y ensalada. Guandolo o jugo.', rem: R('Arroz', 'Aguacate', 'Arepa', 'Ensalada') },
]

export const MENU: Dish[] = [
  { id: 'paisa', cat: 'Especiales', name: 'Bandeja Paisa', price: 35000, tag: 'La favorita', img: '/assets/bandeja-paisa.webp', avail: true, drink: true, proteins: true,
    desc: 'Arroz, frijol, ensalada, papa a la francesa, maduro, chorizo, molida, chicharrón, aguacate, huevo y arepa. Guandolo o jugo.',
    rem: R('Arroz', 'Frijol', 'Ensalada', 'Papa a la francesa', 'Maduro', 'Chorizo', 'Molida', 'Chicharrón', 'Aguacate', 'Huevo', 'Arepa') },
  { id: 'especial', cat: 'Especiales', name: 'Bandeja Especial', price: 25000, tag: 'A elección', img: '/assets/bandeja-especial.webp', avail: true, proteins: true,
    desc: 'Res, cerdo, pollo, molida o chicharrón, con arroz, papa a la francesa, maduro, aguacate y huevo. Ensalada o arepa.',
    groups: [{ id: 'acomp', short: 'ensalada o arepa', title: '¿Ensalada o arepa?', sub: 'Escoge una', options: [{ id: 'ensalada', label: 'Ensalada' }, { id: 'arepa', label: 'Arepa' }] }],
    rem: R('Arroz', 'Papa a la francesa', 'Maduro', 'Aguacate', 'Huevo') },
  { id: 'trucha', cat: 'Pescados', name: 'Trucha', price: 35000, img: '/assets/trucha.webp', avail: true,
    desc: 'Arroz con coco, patacón, ensalada y aguacate. Sopa de pescado y guandolo.',
    rem: R('Arroz con coco', 'Patacón', 'Ensalada', 'Aguacate', 'Sopa de pescado', 'Guandolo') },
  { id: 'tilapia', cat: 'Pescados', name: 'Tilapia', price: 35000, img: '/assets/tilapia.webp', avail: true,
    desc: 'Arroz con coco, patacón, ensalada y aguacate. Sopa de pescado y guandolo.',
    rem: R('Arroz con coco', 'Patacón', 'Ensalada', 'Aguacate', 'Sopa de pescado', 'Guandolo') },
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
]

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
})

export const ORDER_NUM_START = 1043
