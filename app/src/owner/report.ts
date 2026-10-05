import { reportRange, type ReportRow } from '../domain/report.ts'

const fmtFechaLarga = (d: Date | null) => (d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—')
const fmtFechaArchivo = (d: Date | null) =>
  d ? d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') : 'todo'

const toNumber = (v: unknown) => {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}
const safeStr = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())
const colLetter = (n: number) => {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

/**
 * Builds the billing workbook with the owner's template (title, gold range strip, zebra rows,
 * summary panel). v2: every total is written as a value (formulas showed up empty when opened),
 * rows are numbered 1, 2, 3…, and missing or odd data is tolerated. v3: "Platos vendidos" under the
 * summary (total and each dish, most sold first) and a payment column wide enough for its text.
 */
export async function buildReport(rows: ReportRow[], from: string, to: string): Promise<{ blob: Blob; name: string }> {
  const ExcelJS = (await import('exceljs')).default
  const { desde, hasta } = reportRange(from, to)

  // ---------- Normalizar y filtrar ----------
  const filtrados = rows
    .filter(p => p && typeof p === 'object')
    .map(p => {
      const fecha = p.fecha ? new Date(p.fecha) : null
      const valorPlato = toNumber(p.valorPlato)
      const valorDomicilio = toNumber(p.valorDomicilio)
      return {
        fecha,
        cliente: safeStr(p.cliente),
        pedido: safeStr(p.pedido),
        metodoPago: safeStr(p.metodoPago),
        valorPlato,
        valorDomicilio,
        totalPedido: valorPlato + valorDomicilio,
        correo: safeStr(p.correo),
        celular: p.celular != null ? String(p.celular) : '',
        items: Array.isArray(p.items) ? p.items : [],
        fechaValida: !!fecha && !Number.isNaN(fecha.getTime()),
      }
    })
    .filter(p => {
      if (!p.fechaValida) return true // sin fecha, igual lo incluimos
      if (desde && p.fecha! < desde) return false
      if (hasta && p.fecha! > hasta) return false
      return true
    })
    .sort((a, b) => (!a.fechaValida ? 1 : !b.fechaValida ? -1 : a.fecha!.getTime() - b.fecha!.getTime()))

  // ---------- Totales calculados aquí (nunca fórmulas) ----------
  const totalPlatos = filtrados.reduce((s, p) => s + p.valorPlato, 0)
  const totalDomicilios = filtrados.reduce((s, p) => s + p.valorDomicilio, 0)
  const totalIngresos = totalPlatos + totalDomicilios
  const numPedidos = filtrados.length
  const ticketPromedio = numPedidos > 0 ? Math.round(totalIngresos / numPedidos) : 0

  // ---------- Platos vendidos (de mayor a menor) ----------
  const conteo = new Map<string, number>()
  for (const p of filtrados) {
    for (const it of p.items) {
      const nombre = safeStr(it?.nombre), cantidad = toNumber(it?.cantidad)
      if (nombre && cantidad > 0) conteo.set(nombre, (conteo.get(nombre) ?? 0) + cantidad)
    }
  }
  const platosVendidos = [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  const totalPlatosVendidos = platosVendidos.reduce((s, [, n]) => s + n, 0)

  const AZUL = 'FF1F3A5F', DORADO = 'FFC9A96E', GRIS = 'FFF5F5F5', CREMA = 'FFFFFDF7', BLANCO = 'FFFFFFFF', TEXTO = 'FF1A1A1A'
  const wb = new ExcelJS.Workbook()
  wb.creator = 'El Tradicional'
  wb.created = new Date()
  const ws = wb.addWorksheet('Reporte', {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 3 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })
  const NCOLS = 10
  const ENCABEZADOS = ['N° Pedido', 'Fecha', 'Nombre del cliente', '¿Qué pidió?', 'Método de pago', 'Valor del plato', 'Valor del domicilio', 'Total del pedido', 'Correo', 'N° de celular']
  const COP = '"$"#,##0" COP"'
  const solid = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })

  // ---------- Fila 1: título ----------
  ws.mergeCells(1, 1, 1, NCOLS)
  const titulo = ws.getCell(1, 1)
  titulo.value = 'REPORTE FINANCIERO — EL TRADICIONAL'
  titulo.font = { name: 'Arial', size: 22, bold: true, color: { argb: BLANCO } }
  titulo.fill = solid(AZUL)
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 45

  // ---------- Fila 2: franja dorada con el rango ----------
  ws.getRow(2).height = 22
  for (let c = 1; c <= NCOLS; c++) ws.getCell(2, c).fill = solid(DORADO)
  ws.mergeCells(2, 1, 2, NCOLS)
  const info = ws.getCell(2, 1)
  const rango = desde || hasta ? 'Rango: ' + fmtFechaLarga(desde) + '  →  ' + fmtFechaLarga(hasta) : 'Todos los pedidos'
  info.value = rango + '    ·    ' + numPedidos + ' pedido' + (numPedidos === 1 ? '' : 's')
  info.font = { name: 'Arial', size: 10, bold: true, color: { argb: TEXTO } }
  info.fill = solid(DORADO)
  info.alignment = { horizontal: 'center', vertical: 'middle' }

  // ---------- Fila 3: encabezados ----------
  ws.getRow(3).height = 34
  ENCABEZADOS.forEach((t, k) => {
    const c = ws.getCell(3, k + 1)
    c.value = t
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: BLANCO } }
    c.fill = solid(AZUL)
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = { bottom: { style: 'medium', color: { argb: DORADO } } }
  })

  // ---------- Cuerpo ----------
  const filaInicio = 4
  const hayDatos = filtrados.length > 0
  if (hayDatos) {
    filtrados.forEach((p, idx) => {
      const r = filaInicio + idx
      ws.getCell(r, 1).value = idx + 1 // siempre desde 1
      ws.getCell(r, 2).value = p.fechaValida ? p.fecha : ''
      ws.getCell(r, 3).value = p.cliente || '—'
      ws.getCell(r, 4).value = p.pedido || '—'
      ws.getCell(r, 5).value = p.metodoPago || '—'
      ws.getCell(r, 6).value = p.valorPlato
      ws.getCell(r, 7).value = p.valorDomicilio
      ws.getCell(r, 8).value = p.totalPedido // valor, no fórmula
      ws.getCell(r, 9).value = p.correo
      ws.getCell(r, 10).value = p.celular
    })
  } else {
    ws.mergeCells(filaInicio, 1, filaInicio, NCOLS)
    const vacio = ws.getCell(filaInicio, 1)
    vacio.value = 'No hay pedidos en el rango seleccionado.'
    vacio.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF888888' } }
    vacio.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(filaInicio).height = 30
  }
  const filaFin = filaInicio + Math.max(filtrados.length, 1) - 1

  const thin = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
  for (let r = filaInicio; r <= filaFin; r++) {
    for (let col = 1; col <= NCOLS; col++) {
      const c = ws.getCell(r, col)
      if (hayDatos) c.font = { name: 'Arial', size: 10, color: { argb: TEXTO } }
      c.alignment = { ...(c.alignment ?? {}), vertical: 'middle', wrapText: true }
      c.border = { top: thin, left: thin, bottom: thin, right: thin }
      if (hayDatos && r % 2 === 0) c.fill = solid(GRIS)
    }
    if (hayDatos) {
      const mid = { horizontal: 'center' as const, vertical: 'middle' as const }
      const right = { horizontal: 'right' as const, vertical: 'middle' as const }
      ws.getCell(r, 1).alignment = mid; ws.getCell(r, 1).numFmt = '0'
      ws.getCell(r, 2).alignment = mid; ws.getCell(r, 2).numFmt = 'dd/mm/yyyy'
      ws.getCell(r, 5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
      for (const col of [6, 7, 8]) { ws.getCell(r, col).numFmt = COP; ws.getCell(r, col).alignment = right }
      ws.getCell(r, 8).font = { name: 'Arial', size: 10, bold: true, color: { argb: TEXTO } }
      ws.getCell(r, 10).alignment = mid; ws.getCell(r, 10).numFmt = '@'
    }
  }

  // the payment method is never cut: the column fits its longest text
  const anchoPago = Math.min(60, Math.max(18, ...filtrados.map(p => (p.metodoPago || '—').length + 4)))
  ;[12, 14, 24, 32, anchoPago, 16, 18, 18, 26, 16].forEach((w, k) => { ws.getColumn(k + 1).width = w })

  // ---------- Panel de totales (valores siempre llenos) ----------
  const colPanel = NCOLS + 2, colVal = NCOLS + 3
  ws.getColumn(colPanel).width = 26
  ws.getColumn(colVal).width = 22
  ws.mergeCells(3, colPanel, 3, colVal)
  const headPanel = ws.getCell(3, colPanel)
  headPanel.value = 'RESUMEN DEL PERIODO'
  headPanel.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLANCO } }
  headPanel.fill = solid(AZUL)
  headPanel.alignment = { horizontal: 'center', vertical: 'middle' }
  headPanel.border = { bottom: { style: 'medium', color: { argb: DORADO } } }

  const resumen: [string, number, string][] = [
    ['Total ventas (platos):', totalPlatos, COP],
    ['Total domicilios:', totalDomicilios, COP],
    ['Total ingresos:', totalIngresos, COP], // destacada
    ['N° de pedidos:', numPedidos, '0'],
    ['Ticket promedio:', ticketPromedio, COP],
  ]
  const med = { style: 'medium' as const, color: { argb: AZUL } }
  resumen.forEach(([label, valor, fmt], k) => {
    const r = 4 + k, destacada = k === 2
    const lc = ws.getCell(r, colPanel), vc = ws.getCell(r, colVal)
    lc.value = label
    vc.value = valor
    vc.numFmt = fmt
    const font = { name: 'Arial', size: destacada ? 12 : 11, bold: true, color: { argb: destacada ? BLANCO : TEXTO } }
    lc.font = font
    vc.font = font
    lc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    vc.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
    lc.fill = solid(destacada ? AZUL : CREMA)
    vc.fill = solid(destacada ? AZUL : CREMA)
    if (destacada) ws.getRow(r).height = 30
    const last = k === resumen.length - 1
    lc.border = { left: med, top: thin, bottom: last ? med : thin }
    vc.border = { right: med, top: thin, bottom: last ? med : thin }
  })

  // ---------- Platos vendidos (debajo del resumen) ----------
  const filaPlatos = 4 + resumen.length + 2
  ws.mergeCells(filaPlatos, colPanel, filaPlatos, colVal)
  const headPlatos = ws.getCell(filaPlatos, colPanel)
  headPlatos.value = 'PLATOS VENDIDOS'
  headPlatos.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLANCO } }
  headPlatos.fill = solid(AZUL)
  headPlatos.alignment = { horizontal: 'center', vertical: 'middle' }
  headPlatos.border = { bottom: { style: 'medium', color: { argb: DORADO } } }
  const lineasPlatos: [string, number, boolean][] = [
    ['Total platos vendidos:', totalPlatosVendidos, true],
    ...(platosVendidos.length ? platosVendidos.map(([n, c]) => [n, c, false] as [string, number, boolean]) : [['Sin platos en el rango', 0, false] as [string, number, boolean]]),
  ]
  lineasPlatos.forEach(([label, valor, destacada], k) => {
    const r = filaPlatos + 1 + k
    const lc = ws.getCell(r, colPanel), vc = ws.getCell(r, colVal)
    lc.value = label
    vc.value = valor
    vc.numFmt = '0'
    const font = { name: 'Arial', size: destacada ? 12 : 10, bold: destacada, color: { argb: destacada ? BLANCO : TEXTO } }
    lc.font = font
    vc.font = { ...font, bold: true }
    lc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true }
    vc.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
    const fondo = destacada ? AZUL : k % 2 === 0 ? GRIS : CREMA
    lc.fill = solid(fondo)
    vc.fill = solid(fondo)
    if (destacada) ws.getRow(r).height = Math.max(ws.getRow(r).height ?? 0, 26)
    const last = k === lineasPlatos.length - 1
    lc.border = { left: med, top: thin, bottom: last ? med : thin }
    vc.border = { right: med, top: thin, bottom: last ? med : thin }
  })

  // ---------- Verificación final ----------
  const V = colLetter(colVal)
  ;([[4, totalPlatos, 'Total ventas'], [5, totalDomicilios, 'Total domicilios'], [6, totalIngresos, 'Total ingresos'], [7, numPedidos, 'N° de pedidos'], [8, ticketPromedio, 'Ticket promedio']] as const)
    .forEach(([r, esperado, label]) => {
      const v = ws.getCell(V + r).value
      if (v === null || v === undefined || v === '') console.error(`[Reporte] Falta ${label} en ${V}${r}. Esperado:`, esperado)
    })
  if (hayDatos) {
    for (let r = filaInicio; r <= filaFin; r++) {
      const tp = ws.getCell(r, 8).value
      if (typeof tp !== 'number') console.error(`[Reporte] Total del pedido mal escrito en fila ${r}:`, tp)
    }
  }

  const name = 'Reporte-ElTradicional-' + fmtFechaArchivo(desde) + '-' + fmtFechaArchivo(hasta) + '.xlsx'
  const buffer = await wb.xlsx.writeBuffer()
  return { blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name }
}
