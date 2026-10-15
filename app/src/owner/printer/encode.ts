/**
 * Printer commands for a 1-bit image of the ticket. The ticket is always sent as an image, so
 * accents, ñ and the big fonts look the same on any printer, whatever code page it uses.
 * Two languages, because portable printers speak one or the other:
 * - TSPL: label printers (like the DIG-M220 in label mode). Continuous paper: GAP 0.
 * - ESC/POS: receipt printers.
 */

export type PrinterLang = 'tspl' | 'escpos'

/** Head width of a 48 mm printer at 203 dpi (8 dots per mm). */
export const PRINT_WIDTH = 384
export const DOTS_PER_MM = 8

export interface Bitmap { widthBytes: number; height: number; bits: Uint8Array }

/** RGBA pixels → 1 bit per pixel, 1 = black, rows padded to whole bytes, MSB first. */
export function packBits(rgba: ArrayLike<number>, width: number, height: number, threshold = 160): Bitmap {
  const widthBytes = Math.ceil(width / 8)
  const bits = new Uint8Array(widthBytes * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = rgba[i + 3] / 255
      // transparent counts as white paper
      const lum = (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * a + 255 * (1 - a)
      if (lum < threshold) bits[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }
  return { widthBytes, height, bits }
}

const ascii = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0) & 0xff)

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

/** ESC/POS: init, the image in bands (small printer buffers), then feed so it can be torn off. */
export function escposRaster(img: Bitmap, band = 128, feedLines = 4): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x1b, 0x40)]
  for (let y = 0; y < img.height; y += band) {
    const h = Math.min(band, img.height - y)
    parts.push(Uint8Array.of(0x1d, 0x76, 0x30, 0x00, img.widthBytes & 0xff, img.widthBytes >> 8, h & 0xff, h >> 8))
    parts.push(img.bits.subarray(y * img.widthBytes, (y + h) * img.widthBytes))
  }
  parts.push(Uint8Array.of(0x1b, 0x64, feedLines))
  return concat(parts)
}

/**
 * TSPL: one "label" as long as the ticket on continuous paper (GAP 0), then print. In TSPL
 * bitmaps a 0 bit is a printed dot, so the data is inverted.
 */
export function tsplBitmap(img: Bitmap, feedMm = 6): Uint8Array {
  const widthMm = Math.round((img.widthBytes * 8) / DOTS_PER_MM)
  const heightMm = Math.ceil(img.height / DOTS_PER_MM) + feedMm
  const data = img.bits.map(b => ~b & 0xff)
  return concat([
    ascii(`SIZE ${widthMm} mm,${heightMm} mm\r\nGAP 0 mm,0 mm\r\nDIRECTION 1,0\r\nREFERENCE 0,0\r\nCLS\r\n`),
    ascii(`BITMAP 0,0,${img.widthBytes},${img.height},0,`),
    data,
    ascii('\r\nPRINT 1,1\r\n'),
  ])
}

export const encode = (lang: PrinterLang, img: Bitmap) => (lang === 'tspl' ? tsplBitmap(img) : escposRaster(img))
