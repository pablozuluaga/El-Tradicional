import { reportRange, type ReportRow } from '../domain/report.ts'

const fmtFechaLarga = (d: Date | null) => (d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—')
const fmtFechaArchivo = (d: Date | null) =>
  d ? d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') : 'todo'

/** Builds the billing workbook with the owner's template (title, gold range strip, zebra rows, summary panel). */
export async function buildReport(rows: ReportRow[], from: string, to: string): Promise<{ blob: Blob; name: string }> {
  const ExcelJS = (await import('exceljs')).default
  const { desde, hasta } = reportRange(from, to)

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

  ws.mergeCells(1, 1, 1, NCOLS)
  const titulo = ws.getCell(1, 1)
  titulo.value = 'REPORTE FINANCIERO — EL TRADICIONAL'
  titulo.font = { name: 'Arial', size: 22, bold: true, color: { argb: BLANCO } }
  titulo.fill = solid(AZUL)
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 45

  ws.getRow(2).height = 22
  for (let c = 1; c <= NCOLS; c++) ws.getCell(2, c).fill = solid(DORADO)
  ws.mergeCells(2, 1, 2, NCOLS)
  const info = ws.getCell(2, 1)
  info.value = desde || hasta
    ? 'Rango: ' + fmtFechaLarga(desde) + '  →  ' + fmtFechaLarga(hasta) + '    ·    ' + rows.length + ' pedidos'
    : 'Todos los pedidos    ·    ' + rows.length + ' pedidos'
  info.font = { name: 'Arial', size: 10, bold: true, color: { argb: TEXTO } }
  info.fill = solid(DORADO)
  info.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.getRow(3).height = 34
  ENCABEZADOS.forEach((t, k) => {
    const c = ws.getCell(3, k + 1)
    c.value = t
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: BLANCO } }
    c.fill = solid(AZUL)
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = { bottom: { style: 'medium', color: { argb: AZUL } } }
  })

  const filaInicio = 4
  rows.forEach((p, idx) => {
    const r = filaInicio + idx
    ws.getCell(r, 1).value = p.numero || idx + 1
    ws.getCell(r, 2).value = p.fecha
    ws.getCell(r, 3).value = p.cliente
    ws.getCell(r, 4).value = p.pedido
    ws.getCell(r, 5).value = p.metodoPago
    ws.getCell(r, 6).value = Number(p.valorPlato) || 0
    ws.getCell(r, 7).value = Number(p.valorDomicilio) || 0
    ws.getCell(r, 8).value = { formula: 'F' + r + '+G' + r }
    ws.getCell(r, 9).value = p.correo
    ws.getCell(r, 10).value = p.celular
  })
  const filaFin = filaInicio + Math.max(rows.length, 1) - 1

  const thin = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
  for (let r = filaInicio; r <= filaFin; r++) {
    for (let col = 1; col <= NCOLS; col++) {
      const c = ws.getCell(r, col)
      c.font = { name: 'Arial', size: 10, color: { argb: TEXTO } }
      c.alignment = { vertical: 'middle', wrapText: true }
      c.border = { top: thin, left: thin, bottom: thin, right: thin }
      if (r % 2 === 0) c.fill = solid(GRIS)
    }
    const mid = { horizontal: 'center' as const, vertical: 'middle' as const }
    const right = { horizontal: 'right' as const, vertical: 'middle' as const }
    ws.getCell(r, 1).alignment = mid; ws.getCell(r, 1).numFmt = '0'
    ws.getCell(r, 2).alignment = mid; ws.getCell(r, 2).numFmt = 'dd/mm/yyyy'
    ws.getCell(r, 5).alignment = mid
    for (const col of [6, 7, 8]) { ws.getCell(r, col).numFmt = COP; ws.getCell(r, col).alignment = right }
    ws.getCell(r, 10).alignment = mid; ws.getCell(r, 10).numFmt = '@'
  }

  ;[12, 14, 24, 32, 16, 16, 18, 18, 26, 16].forEach((w, k) => { ws.getColumn(k + 1).width = w })

  const colPanel = NCOLS + 2, colVal = NCOLS + 3
  ws.getColumn(colPanel).width = 26
  ws.getColumn(colVal).width = 20
  ws.mergeCells(3, colPanel, 3, colVal)
  const headPanel = ws.getCell(3, colPanel)
  headPanel.value = 'RESUMEN DEL PERIODO'
  headPanel.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLANCO } }
  headPanel.fill = solid(AZUL)
  headPanel.alignment = { horizontal: 'center', vertical: 'middle' }

  const resumen: [string, number | { formula: string }, string][] = [
    ['Total ventas (platos):', { formula: 'SUM(F' + filaInicio + ':F' + filaFin + ')' }, COP],
    ['Total domicilios:', { formula: 'SUM(G' + filaInicio + ':G' + filaFin + ')' }, COP],
    ['Total ingresos:', { formula: 'SUM(H' + filaInicio + ':H' + filaFin + ')' }, COP],
    ['N° de pedidos:', rows.length, '0'],
    ['Ticket promedio:', { formula: 'IFERROR(SUM(H' + filaInicio + ':H' + filaFin + ')/' + rows.length + ',0)' }, COP],
  ]
  resumen.forEach((row, k) => {
    const r = 4 + k, lc = ws.getCell(r, colPanel), vc = ws.getCell(r, colVal)
    lc.value = row[0]; vc.value = row[1]; vc.numFmt = row[2]
    lc.font = { name: 'Arial', size: 11, bold: true, color: { argb: TEXTO } }
    vc.font = { name: 'Arial', size: 11, color: { argb: TEXTO } }
    lc.alignment = { horizontal: 'left', vertical: 'middle' }
    vc.alignment = { horizontal: 'right', vertical: 'middle' }
    lc.fill = solid(CREMA)
    vc.fill = solid(CREMA)
  })
  const rIng = 6
  for (const col of [colPanel, colVal]) {
    ws.getCell(rIng, col).fill = solid(AZUL)
    ws.getCell(rIng, col).font = { name: 'Arial', size: 12, bold: true, color: { argb: BLANCO } }
  }
  ws.getRow(rIng).height = 30
  const med = { style: 'medium' as const, color: { argb: AZUL } }
  for (let r = 3; r <= 8; r++) {
    for (let col = colPanel; col <= colVal; col++) {
      ws.getCell(r, col).border = {
        top: r === 3 ? med : undefined,
        bottom: r === 8 ? med : undefined,
        left: col === colPanel ? med : undefined,
        right: col === colVal ? med : undefined,
      }
    }
  }

  const name = 'Reporte-ElTradicional-' + fmtFechaArchivo(desde) + '-' + fmtFechaArchivo(hasta) + '.xlsx'
  const buffer = await wb.xlsx.writeBuffer()
  return { blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
