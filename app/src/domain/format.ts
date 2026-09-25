export const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const dateShort = (iso: string) => {
  const d = new Date(iso)
  return d.getDate() + ' ' + MONTHS[d.getMonth()]
}

export const timeShort = (iso: string) => {
  const d = new Date(iso)
  let h = d.getHours()
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return h + ':' + mm + ' ' + ap
}

export const dateTime = (iso: string) => dateShort(iso) + ' · ' + timeShort(iso)

export const orderId = (num: number) => '#' + num

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
