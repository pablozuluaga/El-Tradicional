import type { ReactNode } from 'react'
import { GUIDES, type Step } from '../customer/install/guides.tsx'
import { AndroidInstallDialog } from '../customer/install/scenes.tsx'
import { ChromeInstallButton, OpenInChrome } from './scenes.tsx'

/*
 * One video for each way the install page can look on a phone: the browser decides the steps,
 * the brand only the name on screen (and, on Xiaomi and Huawei, the shortcut permission at the end).
 * The keys are the file names in public/videos.
 */

export interface Reel { name: string; steps: Step[]; done: Step; tip?: Step }

const s = (title: string, scene: ReactNode): Step => ({ title, text: null, scene })
const android = GUIDES.androidChrome, ios = (id: 'ios27' | 'ios26' | 'ios18' | 'iosChrome') => GUIDES[id]
const done = android.steps[android.steps.length - 1]
const tip = android.tip!.steps[0]
const actions = (id: keyof typeof GUIDES) => GUIDES[id].steps.slice(0, -1)
const last = (id: keyof typeof GUIDES) => GUIDES[id].steps[GUIDES[id].steps.length - 1]

const button: Step[] = [
  s('Toca el botón “⬇ Instalar la app”', <ChromeInstallButton />),
  s('Toca “Instalar”', <AndroidInstallDialog />),
]
const viaChrome = (bar: 'samsung' | 'generic' | 'inapp'): Step[] => [
  s('Toca “Abrir en Chrome”', <OpenInChrome bar={bar} />),
  s('Se abre Chrome: toca “⬇ Instalar la app”', <ChromeInstallButton />),
  s('Toca “Instalar”', <AndroidInstallDialog />),
]

const BRANDS = {
  samsung: { name: 'Samsung', tip: false },
  xiaomi: { name: 'Xiaomi · Redmi · POCO', tip: true },
  motorola: { name: 'Motorola', tip: false },
  huawei: { name: 'Huawei · Honor', tip: true },
  android: { name: 'Android', tip: false },
} as const

export const REELS: Record<string, Reel> = {
  'iphone-ios27': { name: 'iPhone · iOS 27', steps: actions('ios27'), done: last('ios27') },
  'iphone-ios26': { name: 'iPhone · iOS 26', steps: actions('ios26'), done: last('ios26') },
  'iphone-ios18': { name: 'iPhone · iOS 18 o anterior', steps: actions('ios18'), done: last('ios18') },
  'iphone-chrome': { name: 'iPhone con Chrome', steps: ios('iosChrome').steps.slice(0, -1), done: last('iosChrome') },
  'iphone-instagram': { name: 'iPhone · Instagram o Facebook', steps: [...GUIDES.inapp.steps, ...actions('ios26')], done: last('ios26') },
  ...Object.fromEntries(Object.entries(BRANDS).flatMap(([id, b]) => [
    [`${id}-boton`, { name: b.name, steps: button, done, tip: b.tip ? tip : undefined }],
    [`${id}-menu`, { name: b.name + ' · Chrome', steps: actions('androidChrome'), done, tip: b.tip ? tip : undefined }],
  ])),
  'samsung-navegador': { name: 'Samsung Internet', steps: viaChrome('samsung'), done },
  'xiaomi-navegador': { name: 'Navegador de Xiaomi', steps: viaChrome('generic'), done, tip },
  'huawei-navegador': { name: 'Navegador de Huawei', steps: viaChrome('generic'), done, tip },
  'android-navegador': { name: 'Otro navegador', steps: viaChrome('generic'), done },
  'android-instagram': { name: 'Instagram o Facebook', steps: viaChrome('inapp'), done },
}
