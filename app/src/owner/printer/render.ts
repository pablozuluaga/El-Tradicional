import { packBits, PRINT_WIDTH, type Bitmap } from './encode.ts'
import type { Block } from './ticket.ts'
import { COLS, type TextLine } from './text.ts'

const PAD = 6
const W = PRINT_WIDTH - PAD * 2
const FONT = 'Arial, "Helvetica Neue", Roboto, sans-serif'

/** `lines`: thick rules above and below (no black backgrounds: they slow small printers down). */
interface Style { size: number; weight: number; align: 'left' | 'center'; lines?: boolean; spaceBefore: number }

const STYLES: Record<Exclude<Block['kind'], 'row' | 'rule' | 'gap'>, Style> = {
  brand: { size: 20, weight: 700, align: 'center', spaceBefore: 0 },
  number: { size: 64, weight: 800, align: 'center', spaceBefore: 2 },
  center: { size: 22, weight: 400, align: 'center', spaceBefore: 0 },
  banner: { size: 32, weight: 800, align: 'center', lines: true, spaceBefore: 10 },
  text: { size: 23, weight: 400, align: 'left', spaceBefore: 4 },
  dish: { size: 32, weight: 800, align: 'left', spaceBefore: 4 },
  sin: { size: 30, weight: 800, align: 'left', spaceBefore: 6 },
}

const font = (s: { size: number; weight: number }) => `${s.weight} ${s.size}px ${FONT}`

/** Breaks text into lines that fit `max` pixels (long words are cut). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + word : word
    if (ctx.measureText(next).width <= max) { line = next; continue }
    if (line) out.push(line)
    let w = word
    while (ctx.measureText(w).width > max) {
      let n = w.length
      while (n > 1 && ctx.measureText(w.slice(0, n)).width > max) n--
      out.push(w.slice(0, n)); w = w.slice(n)
    }
    line = w
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}

type Op = (ctx: CanvasRenderingContext2D, y: number) => void

/** Lays the ticket out on a canvas 384 dots wide (48 mm), as tall as it needs. */
export function drawTicket(blocks: Block[]): HTMLCanvasElement {
  const measure = document.createElement('canvas').getContext('2d')!
  const ops: { y: number; op: Op }[] = []
  let y = PAD
  for (const b of blocks) {
    if (b.kind === 'gap') { y += 8; continue }
    if (b.kind === 'rule') {
      const at = y + 8
      ops.push({ y: at, op: (c, yy) => { c.fillRect(PAD, yy, W, 3) } })
      y += 19
      continue
    }
    if (b.kind === 'row') {
      const st = { size: 26, weight: b.bold ? 800 : 400 }
      const at = y + 4
      ops.push({ y: at, op: (c, yy) => {
        c.font = font(st); c.textBaseline = 'top'
        c.textAlign = 'left'; c.fillText(b.left, PAD, yy)
        c.textAlign = 'right'; c.fillText(b.right, PAD + W, yy)
      } })
      y = at + st.size * 1.25
      continue
    }
    const st = { ...STYLES[b.kind], ...(b.kind === 'text' && b.bold ? { weight: 700 } : {}) }
    measure.font = font(st)
    const lines = wrap(measure, b.kind === 'sin' ? '» ' + b.text : b.text, W)
    const lh = Math.round(st.size * 1.22)
    const top = y + st.spaceBefore
    const h = lines.length * lh + (st.lines ? 16 : 0)
    ops.push({ y: top, op: (c, yy) => {
      c.font = font(st); c.textBaseline = 'top'
      if (st.lines) { c.fillRect(PAD, yy, W, 4); c.fillRect(PAD, yy + h - 4, W, 4) }
      lines.forEach((ln, i) => {
        const ty = yy + i * lh + (st.lines ? 9 : 0)
        if (st.align === 'center') { c.textAlign = 'center'; c.fillText(ln, PAD + W / 2, ty) }
        else { c.textAlign = 'left'; c.fillText(ln, PAD, ty) }
      })
    } })
    y = top + h
  }
  const canvas = document.createElement('canvas')
  canvas.width = PRINT_WIDTH
  canvas.height = Math.ceil(y + PAD)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  for (const { y: at, op } of ops) op(ctx, at)
  return canvas
}

export function ticketBitmap(blocks: Block[]): { bitmap: Bitmap; canvas: HTMLCanvasElement } {
  const canvas = drawTicket(blocks)
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  return { bitmap: packBits(data, canvas.width, canvas.height), canvas }
}

/** Preview of the text comanda: monospace, 32 columns, double height/width like the printer. */
export function drawTextTicket(lines: TextLine[]): HTMLCanvasElement {
  const cw = PRINT_WIDTH / COLS, lh = 26
  const height = lines.reduce((h, l) => h + lh * (l.size === 1 ? 1 : 2), 0) + lh * 2
  const canvas = document.createElement('canvas')
  canvas.width = PRINT_WIDTH; canvas.height = height
  const c = canvas.getContext('2d')!
  c.fillStyle = '#fff'; c.fillRect(0, 0, canvas.width, canvas.height); c.fillStyle = '#000'
  c.textBaseline = 'top'
  let y = 6
  for (const l of lines) {
    const sx = l.size === 3 ? 2 : 1, sy = l.size === 1 ? 1 : 2
    const w = l.text.length * cw * sx
    const x = l.align === 'center' ? (PRINT_WIDTH - w) / 2 : l.align === 'right' ? PRINT_WIDTH - w : 0
    c.save(); c.translate(x, y); c.scale(sx, sy)
    c.font = `${l.bold ? 700 : 400} 20px "Courier New", Courier, monospace`
    for (let i = 0; i < l.text.length; i++) c.fillText(l.text[i], i * cw, 0)
    c.restore()
    y += lh * sy
  }
  return canvas
}
