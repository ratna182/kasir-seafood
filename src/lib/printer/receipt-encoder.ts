import type { PrinterConfig } from './types'
import { CHAR_WIDTHS } from './types'
import {
  initPrinter,
  feedAndCut,
  setText,
  setAlign,
  setBold,
  setFontSize,
  compose,
  padRight,
  drawLine,
  formatRupiah,
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

function encodeLine(text: string, bold: boolean = false, align: 'left' | 'center' | 'right' = 'left', fontSize: 1 | 2 = 1): Uint8Array {
  const parts: Uint8Array[] = []
  if (bold) parts.push(setBold(true))
  if (align !== 'left') parts.push(setAlign(align))
  if (fontSize > 1) parts.push(setFontSize(fontSize))
  parts.push(setText(text + '\n'))
  if (fontSize > 1) parts.push(setFontSize(1))
  if (align !== 'left') parts.push(setAlign('left'))
  if (bold) parts.push(setBold(false))
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

  parts.push(initPrinter())
  parts.push(setFontSize(1, 1))

  if (data.reprint) {
    parts.push(encodeLine(centerText('*** CETAK ULANG STRUK RESMI ***', w), true, 'center'))
  }

  parts.push(encodeLine(centerText(data.warungNama || 'WARUNG', w), true, 'center'))
  parts.push(encodeLine(centerText('Jl. Raya Kranggan no.18', w), false, 'center'))
  parts.push(encodeLine(centerText('IG : Seafood08vianjaya.id', w), false, 'center'))
  parts.push(encodeLine(centerText('FB : Seafood08vianjaya', w), false, 'center'))
  parts.push(encodeLine(centerText('TT : Seafood08vianjaya', w), false, 'center'))

  parts.push(encodeLine(drawLine(w)))

  const date = new Date(t.createdAt)
  const dateStr = date.toLocaleDateString('sv-SE')
  const timeStr = date.toLocaleTimeString('id-ID')
  const metaLeft = `${dateStr}\n${timeStr}`
  const metaRight = `Kasir : ${data.cashier}`
  parts.push(encodeLine(metaLeft, false, 'left'))
  parts.push(encodeLine(metaRight, false, 'right'))

  parts.push(encodeLine(drawLine(w)))

  for (const item of t.items) {
    const price = formatRupiah(item.subtotal)
    const nameLine = padRight(item.namaMenu, w - price.length) + price
    parts.push(encodeLine(nameLine, true))

    const detail = `${item.qty} X ${formatRupiah(item.hargaSatuan)}${item.diskonSatuan ? ` - diskon ${formatRupiah(item.diskonSatuan)}` : ''}`
    parts.push(encodeLine(detail))

    if (item.catatan) {
      parts.push(encodeLine(item.catatan))
    }
  }

  parts.push(encodeLine(drawLine(w)))

  const totalQty = t.items.reduce((acc, item) => acc + item.qty, 0)
  const subtotalLine = padRight('Total QTY :', w - String(totalQty).length) + String(totalQty)
  parts.push(encodeLine(subtotalLine))

  const subPrice = formatRupiah(t.total)
  parts.push(encodeLine(padRight('Subtotal', w - subPrice.length) + subPrice))

  parts.push(encodeLine(drawLine(w)))

  const totalStr = formatRupiah(t.total)
  parts.push(encodeLine(padRight('Total', w - totalStr.length) + totalStr, true))

  const bayarStr = formatRupiah(t.total)
  parts.push(encodeLine(padRight('Bayar', w - bayarStr.length) + bayarStr))

  parts.push(encodeLine('Kembali' + rightText('Rp 0', w - 8)))

  parts.push(encodeLine(drawLine(w)))

  parts.push(encodeLine(centerText('Terima Kasih', w), false, 'center'))
  parts.push(encodeLine(centerText('Selamat Datang Kembali', w), false, 'center'))
  parts.push(encodeLine(centerText('Kritik dan Saran WA', w), false, 'center'))
  parts.push(encodeLine(centerText('0852-8000-4508', w), false, 'center'))

  parts.push(feedAndCut(4))

  return compose(...parts)
}
