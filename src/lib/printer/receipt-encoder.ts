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
  formatRupiah,
  setCharset,
  setCodePage,
  setPrintDensity,
} from './escpos'

export interface ReceiptTransaction {
  id: string
  nomorMeja: string
  total: number
  createdAt: string
  metodePembayaran?: string | null
  items: Array<{
    namaMenu: string
    hargaSatuan: number
    diskonSatuan?: number
    catatan?: string | null
    qty: number
    subtotal: number
  }>
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  const pad = Math.floor((width - text.length) / 2)
  return ' '.repeat(pad) + text
}

function rightText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width)
  return ' '.repeat(width - text.length) + text
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

export function encodeReceipt(
  data: {
    transaction: ReceiptTransaction
    cashier: string
    warungNama: string | null
    width: '58mm' | '80mm'
    reprint?: boolean
  },
): Uint8Array {
  const w = CHAR_WIDTHS[data.width]
  const t = data.transaction
  const parts: Uint8Array[] = []

  // Initialize printer with better compatibility settings
  parts.push(initPrinter())
  parts.push(setCharset(0)) // USA character set
  parts.push(setCodePage(0)) // CP437 code page
  parts.push(setPrintDensity(7)) // Default density
  parts.push(setLineSpacing(20))
  parts.push(setFontSize(1, 1))

  if (data.reprint) {
    parts.push(encodeLine(centerText('*** CETAK ULANG STRUK RESMI ***', w), true, 'center', 1))
  }

  parts.push(encodeLine(centerText(data.warungNama || 'WARUNG', w), true, 'center', 2))
  parts.push(encodeLine(centerText('Jl. Raya Kranggan no.18', w), true, 'center'))
  parts.push(encodeLine(centerText('IG : Seafood08vianjaya.id', w), true, 'center'))
  parts.push(encodeLine(centerText('FB : Seafood08vianjaya', w), true, 'center'))
  parts.push(encodeLine(centerText('TT : Seafood08vianjaya', w), true, 'center'))

  parts.push(encodeLine(drawLine(w), true))

  const date = new Date(t.createdAt)
  const dateStr = date.toLocaleDateString('sv-SE')
  const timeStr = date.toLocaleTimeString('id-ID')
  parts.push(encodeLine(`${dateStr}  ${timeStr}`, true, 'left'))
  parts.push(encodeLine(`Kasir : ${data.cashier}`, true, 'right'))

  parts.push(encodeLine(drawLine(w), true))

  for (const item of t.items) {
    const price = formatRupiah(item.subtotal)
    const nameLine = padRight(item.namaMenu, w - price.length) + price
    parts.push(encodeLine(nameLine, true))

    const detail = `${item.qty} X ${formatRupiah(item.hargaSatuan)}${item.diskonSatuan ? ` - diskon ${formatRupiah(item.diskonSatuan)}` : ''}`
    parts.push(encodeLine(detail, true))

    if (item.catatan) {
      parts.push(encodeLine(item.catatan, true))
    }
  }

  parts.push(encodeLine(drawLine(w), true))

  const totalQty = t.items.reduce((acc, item) => acc + item.qty, 0)
  parts.push(encodeLine(`Total QTY : ${totalQty}`, true))
  parts.push(encodeLine(`Subtotal   ${formatRupiah(t.total)}`, true))

  parts.push(encodeLine(drawLine(w), true))

  parts.push(encodeLine(`Total      ${formatRupiah(t.total)}`, true, 'left', 2))
  parts.push(encodeLine(`Bayar      ${formatRupiah(t.total)}`, true))
  parts.push(encodeLine(`Kembali    Rp 0`, true))

  parts.push(encodeLine(drawLine(w), true))

  parts.push(encodeLine(centerText('Terima Kasih', w), true, 'center'))
  parts.push(encodeLine(centerText('Selamat Datang Kembali', w), true, 'center'))
  parts.push(encodeLine(centerText('Kritik dan Saran WA', w), true, 'center'))
  parts.push(encodeLine(centerText('0852-8000-4508', w), true, 'center'))

  parts.push(setLineSpacing(30))
  parts.push(feedAndCut(3))

  return compose(...parts)
}
