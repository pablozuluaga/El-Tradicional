import type { Block } from './ticket.ts'

/*
 * The comanda as plain text for ESC/POS printers: a few hundred bytes instead of a ~30 KB image,
 * so it goes out in a second and survives a slow Bluetooth link. No black backgrounds: what
 * matters is big, bold and centered. Accents are dropped (the printer's code page is unknown and
 * many portable printers start in Chinese mode); the cooks read "Menu del dia" just as well.
 */

/** Characters per line on a 48 mm head with the standard 12×24 font. */
export const COLS = 32

export interface TextLine {
  text: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  /** 1 = normal, 2 = double height, 3 = double width and height */
  size: 1 | 2 | 3
}

/** ASCII only: "Menú del día ñ ×" → "Menu del dia n x". */
export function plain(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[×✕]/g, 'x').replace(/[·•]/g, '-').replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
}

/** Word wrap to `width` characters (long words are cut). */
export function wrapCols(text: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (line) { out.push(line); line = '' }
      out.push(word.slice(0, width)); word = word.slice(width)
    }
    if (!word) continue
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ' ' + word
    else { out.push(line); line = word }
  }
  if (line) out.push(line)
  return out
}

const rule = (ch: string): TextLine => ({ text: ch.repeat(COLS), align: 'left', bold: false, size: 1 })

export function layoutText(blocks: Block[]): TextLine[] {
  const out: TextLine[] = []
  const add = (text: string, align: TextLine['align'], bold: boolean, size: TextLine['size']) => {
    const width = size === 3 ? COLS / 2 : COLS
    for (const t of wrapCols(plain(text), width)) out.push({ text: t, align, bold, size })
  }
  for (const b of blocks) {
    switch (b.kind) {
      case 'brand': add(b.text, 'center', true, 1); break
      case 'number': add(b.text, 'center', true, 3); break
      case 'center': add(b.text, 'center', false, 1); break
      case 'banner': out.push(rule('=')); add(b.text, 'center', true, 2); out.push(rule('=')); break
      case 'dish': add(b.text, 'left', true, 2); break
      case 'sin': add('>> ' + b.text, 'left', true, 2); break
      case 'text': add(b.text, 'left', !!b.bold, 1); break
      case 'row': {
        const l = plain(b.left), r = plain(b.right)
        out.push({ text: l + ' '.repeat(Math.max(1, COLS - l.length - r.length)) + r, align: 'left', bold: !!b.bold, size: 1 })
        break
      }
      case 'rule': out.push(rule('-')); break
      case 'gap': out.push({ text: '', align: 'left', bold: false, size: 1 }); break
    }
  }
  return out
}

const ALIGN = { left: 0, center: 1, right: 2 } as const
const SIZE = { 1: 0x00, 2: 0x01, 3: 0x11 } as const

/** ESC/POS bytes: init, Chinese mode off, then each line with its alignment, bold and size, then feed. */
export function escposText(lines: TextLine[], feedLines = 4): Uint8Array<ArrayBuffer> {
  const out: number[] = [0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x74, 0x00]
  for (const l of lines) {
    out.push(0x1b, 0x61, ALIGN[l.align], 0x1b, 0x45, l.bold ? 1 : 0, 0x1d, 0x21, SIZE[l.size])
    for (const ch of l.text) out.push(ch.charCodeAt(0))
    out.push(0x0a)
  }
  out.push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x61, 0, 0x1b, 0x64, feedLines)
  return Uint8Array.from(out)
}

/** A short line to check the channel: an ESC/POS printer prints it; others ignore it. */
export const TEST_BYTES = escposText([{ text: 'PRUEBA EL TRADICIONAL', align: 'center', bold: true, size: 1 }], 3)
