import type { Order, OrderStatus } from '../../domain/types.ts'
import { encode, type PrinterLang } from './encode.ts'
import { ticketBitmap } from './render.ts'
import { buildTicket, type Block } from './ticket.ts'

/*
 * The kitchen printer, over Bluetooth Low Energy from Chrome (Web Bluetooth). Safari/iPhone has
 * no Web Bluetooth, so an Android phone with the panel open in Chrome acts as the print station:
 * it prints every order accepted from any device.
 */

// Minimal Web Bluetooth types (not in TypeScript's DOM lib).
interface BtCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValueWithoutResponse?(v: BufferSource): Promise<void>
  writeValueWithResponse?(v: BufferSource): Promise<void>
  writeValue(v: BufferSource): Promise<void>
}
interface BtService { getCharacteristics(): Promise<BtCharacteristic[]> }
interface BtServer { connected: boolean; connect(): Promise<BtServer>; disconnect(): void; getPrimaryServices(): Promise<BtService[]> }
interface BtDevice extends EventTarget { id: string; name?: string; gatt?: BtServer }
interface Bluetooth {
  requestDevice(o: { acceptAllDevices?: boolean; filters?: { namePrefix: string }[]; optionalServices: string[] }): Promise<BtDevice>
  getDevices?(): Promise<BtDevice[]>
}
const bt = (): Bluetooth | undefined => (navigator as Navigator & { bluetooth?: Bluetooth }).bluetooth

/** Write services used by portable thermal printers (Gprinter and most generic brands). */
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
]

export type PrinterStatus = 'unsupported' | 'off' | 'connecting' | 'ready' | 'printing' | 'error'

export interface PrinterState {
  status: PrinterStatus
  name: string | null
  /** what went wrong, in words for the owner */
  error: string | null
  /** an order that couldn't be printed, to retry */
  failed: number | null
  lang: PrinterLang
  /** print every order accepted (from any device) on this phone */
  auto: boolean
}

interface Saved { lang: PrinterLang; auto: boolean; name: string | null; chunk: number }
const KEY = 'et-printer'
const PRINTED_KEY = 'et-printed'

function load(): Saved {
  const d: Saved = { lang: 'tspl', auto: true, name: null, chunk: 180 }
  try { return { ...d, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return d }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

class Printer {
  private saved = load()
  private device: BtDevice | null = null
  private ch: BtCharacteristic | null = null
  private queue: Promise<void> = Promise.resolve()
  private seen = new Map<number, OrderStatus>()
  private primed = false
  private listeners = new Set<() => void>()
  private wakeLock: { release(): Promise<void> } | null = null
  state: PrinterState = {
    status: bt() ? 'off' : 'unsupported',
    name: this.saved.name, error: null, failed: null, lang: this.saved.lang, auto: this.saved.auto,
  }

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getState = () => this.state
  private set(p: Partial<PrinterState>) { this.state = { ...this.state, ...p }; this.listeners.forEach(l => l()) }
  private save(p: Partial<Saved>) {
    this.saved = { ...this.saved, ...p }
    try { localStorage.setItem(KEY, JSON.stringify(this.saved)) } catch { /* settings stay for this visit */ }
  }

  setLang(lang: PrinterLang) { this.save({ lang }); this.set({ lang }) }
  setAuto(auto: boolean) { this.save({ auto }); this.set({ auto }); void this.keepAwake() }

  /** First time (and after Chrome forgets it): the owner picks the printer from Chrome's list. */
  async connect() {
    const b = bt()
    if (!b) return
    this.set({ status: 'connecting', error: null })
    try {
      const device = await b.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES })
      await this.attach(device)
    } catch (e) {
      const cancelled = e instanceof Error && e.name === 'NotFoundError'
      this.set({ status: this.ch ? 'ready' : 'off', error: cancelled ? null : 'No se pudo conectar. Revisa que la impresora esté prendida y cerca.' })
    }
  }

  /** On opening the panel: reconnect to the printer Chrome already has permission for, if any. */
  async reconnect() {
    const b = bt()
    if (!b?.getDevices || !this.saved.name || this.ch) return
    try {
      const known = (await b.getDevices()).find(d => d.name === this.saved.name)
      if (known) { this.set({ status: 'connecting' }); await this.attach(known) }
    } catch {
      this.set({ status: 'off' })
    }
  }

  disconnect() {
    this.device?.gatt?.disconnect()
    this.device = null; this.ch = null
    this.set({ status: 'off' })
  }

  private onDisconnected = () => {
    this.ch = null
    if (this.state.status !== 'off') this.set({ status: 'off' })
  }

  private async attach(device: BtDevice) {
    this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected)
    this.device = device
    device.addEventListener('gattserverdisconnected', this.onDisconnected)
    const server = await device.gatt!.connect()
    let found: BtCharacteristic | null = null
    for (const s of await server.getPrimaryServices()) {
      for (const c of await s.getCharacteristics()) {
        if (c.properties.writeWithoutResponse || c.properties.write) { found = c; break }
      }
      if (found) break
    }
    if (!found) throw new Error('no writable characteristic')
    this.ch = found
    this.save({ name: device.name ?? null })
    this.set({ status: 'ready', name: device.name ?? 'Impresora', error: null })
    void this.keepAwake()
  }

  /** Keeps this phone's screen on while it is the print station (Chrome may pause a sleeping tab). */
  private async keepAwake() {
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
    if (this.state.auto && this.ch && !this.wakeLock && nav.wakeLock) {
      try { this.wakeLock = await nav.wakeLock.request('screen') } catch { /* not allowed now */ }
    } else if ((!this.state.auto || !this.ch) && this.wakeLock) {
      await this.wakeLock.release().catch(() => {}); this.wakeLock = null
    }
  }

  private async ensureConnected() {
    if (this.ch && this.device?.gatt?.connected) return
    if (this.device) { await this.attach(this.device); return }
    throw new Error('not connected')
  }

  private async write(data: Uint8Array) {
    const c = this.ch!
    const size = this.saved.chunk
    for (let i = 0, n = 0; i < data.length; i += size, n++) {
      const part = data.slice(i, i + size)
      if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) await c.writeValueWithoutResponse(part)
      else if (c.writeValueWithResponse) await c.writeValueWithResponse(part)
      else await c.writeValue(part)
      // let the printer's small buffer drain
      if (n % 6 === 5) await sleep(20)
    }
  }

  /** Prints the blocks; one at a time, in the order asked. */
  printBlocks(blocks: Block[], num: number | null = null): Promise<void> {
    const job = async () => {
      this.set({ status: 'printing', error: null })
      try {
        await this.ensureConnected()
        const data = encode(this.saved.lang, ticketBitmap(blocks).bitmap)
        try {
          await this.write(data)
        } catch (e) {
          // some printers only take 20-byte writes: retry once with those
          if (this.saved.chunk === 20) throw e
          this.save({ chunk: 20 })
          await this.write(data)
        }
        if (num !== null) this.markPrinted(num)
        this.set({ status: 'ready', failed: this.state.failed === num ? null : this.state.failed })
      } catch {
        this.set({
          status: this.ch ? 'ready' : 'off',
          failed: num,
          error: num !== null ? `No se pudo imprimir el pedido #${num}. Revisa que la impresora esté prendida y conectada.` : 'No se pudo imprimir. Revisa que la impresora esté prendida y conectada.',
        })
      }
    }
    this.queue = this.queue.then(job)
    return this.queue
  }

  printOrder(o: Order, fees: Record<string, number>) {
    return this.printBlocks(buildTicket(o, fees), o.num)
  }

  private printed(): number[] {
    try { return JSON.parse(localStorage.getItem(PRINTED_KEY) ?? '[]') } catch { return [] }
  }
  private markPrinted(num: number) {
    try { localStorage.setItem(PRINTED_KEY, JSON.stringify([...this.printed().filter(n => n !== num), num].slice(-300))) } catch { /* fine */ }
  }

  /**
   * Called with the panel's orders on every change. Prints each order that becomes "aceptado"
   * while the panel is open (accepted here or on another phone), once. Orders already accepted
   * when the panel opened are not printed again; the "Imprimir" button reprints any order.
   */
  onOrders(orders: Order[], fees: Record<string, number>) {
    if (!this.primed) {
      for (const o of orders) this.seen.set(o.num, o.status)
      this.primed = true
      return
    }
    for (const o of orders) {
      const prev = this.seen.get(o.num)
      this.seen.set(o.num, o.status)
      if (o.status !== 'aceptado' || prev === 'aceptado' || prev === undefined) continue
      if (!this.state.auto || this.state.status === 'unsupported' || this.printed().includes(o.num)) continue
      void this.printOrder(o, fees)
    }
  }
}

export const printer = new Printer()
