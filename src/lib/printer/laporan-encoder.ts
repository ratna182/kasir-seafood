import type { PrinterConfig } from './types'
import { CHAR_WIDTHS } from './types'
import {
  initPrinter,
  feedAndCut,
  setText,
  setAlign,
  setBold,
  setFontSize,
  setLineSpacing,
  compose,
  padRight,
  drawLine,
} from './escpos'

export interface LaporanRekapItem {
  namaMenu: string
  kategori: string
  qtyTotal: number
  pendapatanTotal: number
}

export interface LaporanData {
  tanggal: string
  warung: { id: string; nama: string; kode: string }
  rekap: LaporanRekapItem[]
  grandTotalQty: number
  grandTotalPendapatan: number
  jumlahTransaksi: number
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  const pad = Math.floor((width - text.length) / 2)
  return ' '.repeat(pad) + text
}

function encodeLine(text: string, bold: boolean = true, align: 'left' | 'center' | 'right' = 'left', fontSize: 1 | 2 = 1): Uint8Array {
  const parts: Uint8Array[] = []
  parts.push(setBold(bold))
  if (align !== 'left') parts.push(setAlign(align))
  if (fontSize > 1) parts.push(setFontSize(fontSize, fontSize))
  parts.push(setText(text + '\n'))
  if (fontSize > 1) parts.push(setFontSize(1, 1))
  if (align !== 'left') parts.push(setAlign('left'))
  return compose(...parts)
}

export function encodeLaporan(
  data: LaporanData,
  cashierName: string,
  warungNama: string | null,
  warungKode: string | null,
  width: '58mm' | '80mm',
  kasirSesi?: { ditutupPada: string; ditutupOleh: string } | null,
): Uint8Array {
  const w = CHAR_WIDTHS[width]
  const parts: Uint8Array[] = []

  parts.push(initPrinter())
  parts.push(setLineSpacing(20))
  parts.push(setFontSize(1, 1))

  parts.push(encodeLine(centerText('LAPORAN PENJUALAN', w), true, 'center', 2))
  parts.push(encodeLine(centerText('HARIAN', w), true, 'center', 2))
  parts.push(encodeLine(centerText(warungNama || 'WARUNG', w), true, 'center'))
  if (warungKode) {
    parts.push(encodeLine(centerText(`Kode: ${warungKode}`, w), true, 'center'))
  }

  parts.push(encodeLine(drawLine(w), true))

  parts.push(encodeLine(`Tanggal : ${data.tanggal}`, true))
  parts.push(encodeLine(`Dicetak : ${new Date().toLocaleTimeString('id-ID')}`, true))
  parts.push(encodeLine(`Kasir   : ${cashierName}`, true))

  if (kasirSesi) {
    parts.push(encodeLine('Status  : SUDAH DITUTUP', true))
    parts.push(encodeLine(`Pkl     : ${new Date(kasirSesi.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, true))
  }

  parts.push(encodeLine(drawLine(w), true))

  for (const item of data.rekap) {
    const qtyStr = String(item.qtyTotal)
    const totalStr = `Rp ${item.pendapatanTotal.toLocaleString('id-ID')}`
    const leftWidth = w - qtyStr.length - totalStr.length - 2
    const nameLine = padRight(item.namaMenu, Math.max(1, leftWidth)) + qtyStr + ' ' + totalStr
    parts.push(encodeLine(nameLine, true))
  }

  parts.push(encodeLine(drawLine(w), true))

  const gtyStr = String(data.grandTotalQty)
  const gtpStr = `Rp ${data.grandTotalPendapatan.toLocaleString('id-ID')}`
  const gLeft = w - gtyStr.length - gtpStr.length - 2
  parts.push(encodeLine(padRight('TOTAL QTY', Math.max(1, gLeft)) + gtyStr + ' ' + gtpStr, true))

  const jmlStr = `${data.jumlahTransaksi} transaksi`
  const jLeft = w - jmlStr.length
  parts.push(encodeLine(padRight('TOTAL TRANSAKSI', Math.max(1, jLeft)) + jmlStr, true))

  parts.push(encodeLine(drawLine(w), true))

  const gtLabel = 'GRAND TOTAL'
  const gtVal = `Rp ${data.grandTotalPendapatan.toLocaleString('id-ID')}`
  const gtLeft = w - gtLabel.length - gtVal.length
  parts.push(encodeLine(padRight(gtLabel, Math.max(1, gtLeft)) + gtVal, true, 'left', 2))

  parts.push(encodeLine(drawLine(w), true))

  parts.push(encodeLine(centerText('*** REKAPITULASI RESMI ***', w), true, 'center'))
  parts.push(encodeLine(centerText('Kasir Vian Jaya 08', w), true, 'center'))

  parts.push(setLineSpacing(30))
  parts.push(feedAndCut(3))

  return compose(...parts)
}
