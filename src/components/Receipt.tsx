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

  return (
    <div className={`${preview ? 'receipt-preview' : 'print-only print-receipt'} receipt-${width}`} style={{ textAlign: 'center' }}>
      <div className="print-header">
        <h2>{warungNama}</h2>
        <p>IG : Seafood08vianjaya.id</p>
        <p>FB : Seafood08vianjaya</p>
        <p>TT : Seafood08vianjaya</p>
      </div>
      <div className="print-divider" />
      <div className="receipt-meta" style={{ justifyContent: 'center', gap: '1rem' }}>
        <div>{date.toLocaleDateString('sv-SE')}<br />{date.toLocaleTimeString('id-ID')}</div>
        <span>Kasir : {cashier}</span>
      </div>
      <div className="print-divider" />
      <table className="receipt-table">
        <tbody>
          {transaction.items.map((item, index) => (
            <tr key={index}>
              <td>
                <div className="receipt-item"><span className="receipt-item-name">{item.namaMenu}</span><span className="receipt-item-price">{rupiah(item.subtotal)}</span></div>
                <div className="receipt-item-detail">{item.qty} X {rupiah(item.hargaSatuan)}{item.diskonSatuan ? ` - diskon ${rupiah(item.diskonSatuan)}` : ''}</div>
                {item.catatan && <div className="receipt-item-note">{item.catatan}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-divider" />
      <div className="receipt-summary">
        <div className="receipt-total-row"><span>Total QTY :</span><span>{totalQty}</span></div>
        <div className="receipt-total-row"><span>Subtotal</span><span>{rupiah(transaction.total)}</span></div>
      </div>
      <div className="print-divider" />
      <div className="receipt-summary receipt-grand-section">
        <div className="receipt-total-row receipt-grand"><span>Total</span><span>{rupiah(transaction.total)}</span></div>
        <div className="receipt-total-row"><span>Bayar</span><span>{rupiah(transaction.total)}</span></div>
        <div className="receipt-total-row"><span>Kembali</span><span>Rp 0</span></div>
      </div>
      <div className="print-divider" />
      <div className="print-footer">
        {reprint && <p>*** CETAK ULANG STRUK RESMI ***</p>}
        <p>Terima Kasih</p>
        <p>Selamat Datang Kembali</p>
        <p>Kritik dan Saran WA</p>
        <p>0852-8000-4508</p>
      </div>
    </div>
  )
}
