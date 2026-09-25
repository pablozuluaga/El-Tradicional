import type { CartLine, Origin } from '../domain/types.ts'

export interface Address { id: string; line: string; apt: string; notes: string }

export interface DeviceState {
  deviceId: string
  firstName: string
  lastName: string
  email: string
  avatar: string
  gateDone: boolean
  tourDone: boolean
  addresses: Address[]
  /** 'new' = the address form is open */
  selectedAddr: string
  cart: CartLine[]
  mode: Origin
  zone: string
  pay: string
  phone: string
  lastOrderNum: number | null
}

const KEY = 'et:device:v1'

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2)

const initial = (): DeviceState => ({
  deviceId: uuid(),
  firstName: '', lastName: '', email: '', avatar: '',
  gateDone: false, tourDone: false,
  addresses: [], selectedAddr: 'new',
  cart: [],
  mode: 'domicilio', zone: '', pay: 'efectivo', phone: '',
  lastOrderNum: null,
})

function load(): DeviceState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...(JSON.parse(raw) as Partial<DeviceState>) }
  } catch { /* fall through */ }
  const s = initial()
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  return s
}

/** Customer-only state that never leaves this device (profile, cart, addresses, preferences). */
class DeviceStore {
  private state: DeviceState = load()
  private listeners = new Set<() => void>()

  constructor() {
    window.addEventListener('storage', e => {
      if (e.key !== KEY || !e.newValue) return
      try { this.state = { ...initial(), ...(JSON.parse(e.newValue) as Partial<DeviceState>) } } catch { return }
      this.listeners.forEach(l => l())
    })
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getSnapshot = () => this.state

  update = (patch: Partial<DeviceState> | ((s: DeviceState) => Partial<DeviceState>)) => {
    const p = typeof patch === 'function' ? patch(this.state) : patch
    this.state = { ...this.state, ...p }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state))
    } catch {
      // Storage full (usually a big avatar): keep going in memory without the photo.
      try { localStorage.setItem(KEY, JSON.stringify({ ...this.state, avatar: '' })) } catch { /* ignore */ }
    }
    this.listeners.forEach(l => l())
  }
}

let instance: DeviceStore | null = null
export const deviceStore = () => (instance ??= new DeviceStore())

/** Shrinks a gallery photo to a 256px square JPEG data URL so it fits in localStorage. */
export function downscaleAvatar(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return }
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}
