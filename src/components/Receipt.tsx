'use client'

export type PrinterWidth = '58mm' | '80mm'

export interface ReceiptTransaction {
  id: string
  nomorMeja: string
  total: number
  createdAt: string
  metodePembayaran?: string | null
  items: Array<{ namaMenu: string; hargaSatuan: number; diskonSatuan?: number; catatan?: string | null; qty: number; subtotal: number }>
}

interface ReceiptProps {
  transaction: ReceiptTransaction
  cashier: string
  warungNama: string | null
  width: PrinterWidth
  preview?: boolean
  reprint?: boolean
}

const rupiah = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`

export default function Receipt({ transaction, cashier, warungNama, width, preview, reprint }: ReceiptProps) {
  const date = new Date(transaction.createdAt)
  const totalQty = transaction.items.reduce((total, item) => total + item.qty, 0)
  const payment = transaction.metodePembayaran === 'QRIS' ? 'QRIS' : 'Cash'
  const itemCount = transaction.items.length
  const isCompact = itemCount > 8

  return (
    <div className={`${preview ? 'receipt-preview' : 'print-only print-receipt'} receipt-${width} ${isCompact ? 'compact' : ''}`}>
      <div className="print-header">
        <h2>{warungNama}</h2>
        <p>IG : Seafood08vianjaya.id</p>
        <p>FB : Seafood08vianjaya</p>
        <p>TT : Seafood08vianjaya</p>
      </div>
      <div className="print-divider" />
      <div className="receipt-meta">
        <div>{date.toLocaleDateString('sv-SE')} {date.toLocaleTimeString('id-ID')} | Kasir : {cashier}</div>
      </div>
      <div className="print-divider" />
      <div className="receipt-items">
        {transaction.items.map((item, index) => (
          <div key={index} className="receipt-item-block">
            {isCompact ? (
              <div className="receipt-item-row">
                <span>{item.namaMenu} {item.qty}x</span>
                <span>{rupiah(item.subtotal)}</span>
              </div>
            ) : (
              <>
                <div className="receipt-item-row">
                  <span>{item.namaMenu}</span>
                  <span>{rupiah(item.subtotal)}</span>
                </div>
                <div className="receipt-item-detail">{item.qty} x {rupiah(item.hargaSatuan)}{item.diskonSatuan ? ` -${rupiah(item.diskonSatuan)}` : ''}</div>
                {item.catatan && <div className="receipt-item-note">{item.catatan}</div>}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="print-divider" />
      <div className="receipt-summary">
        <div className="receipt-row"><span>Total QTY</span><span>{totalQty}</span></div>
        <div className="receipt-row"><span>Subtotal</span><span>{rupiah(transaction.total)}</span></div>
        <div className="receipt-row receipt-grand"><span>Total</span><span>{rupiah(transaction.total)}</span></div>
        <div className="receipt-row"><span>Bayar</span><span>{rupiah(transaction.total)}</span></div>
        <div className="receipt-row"><span>Kembali</span><span>Rp 0</span></div>
      </div>
      <div className="print-divider" />
      <div className="print-footer">
        {reprint && <p>*** CETAK ULANG STRUK RESMI ***</p>}
        <p>Terima Kasih - Selamat Datang Kembali</p>
        <p>Kritik Saran WA : 0852-8000-4508</p>
      </div>
    </div>
  )
}
