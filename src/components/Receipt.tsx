'use client'

export type PrinterWidth = '58mm' | '80mm'

interface ReceiptProps {
  transaction: {
    id: string
    nomorMeja: string
    total: number
    createdAt: string
    metodePembayaran?: string | null
    items: Array<{ namaMenu: string; hargaSatuan: number; diskonSatuan?: number; catatan?: string | null; qty: number; subtotal: number }>
  }
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
    <div className={`${preview ? 'receipt-preview' : 'print-only print-receipt'} receipt-${width}`}>
      <div className="print-header">
        <h2>{warungNama}</h2>
        <p>IG : Seafood08vianjaya.id</p>
        <p>FB : Seafood08vianjaya</p>
        <p>TT : Seafood08vianjaya</p>
      </div>
      <div className="print-divider" />
      <div className="receipt-meta">
        <div>{date.toLocaleDateString('sv-SE')}<br />{date.toLocaleTimeString('id-ID')}</div>
        <span>Kasir : {cashier}</span>
      </div>
      <div className="print-divider" />
      <table className="receipt-table">
        <tbody>
          {transaction.items.map((item, index) => (
            <tr key={index}>
              <td><div className="receipt-item"><span>{item.namaMenu}</span><span>{rupiah(item.subtotal)}</span></div><div>{item.qty} X {rupiah(item.hargaSatuan)}{item.diskonSatuan ? ` - diskon ${rupiah(item.diskonSatuan)}` : ''}</div>{item.catatan && <div>{item.catatan}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-divider" />
      <div className="receipt-total">Total QTY : {totalQty}</div>
      <div className="receipt-total"><span>Sub Total</span><span>{rupiah(transaction.total)}</span></div>
      <div className="receipt-total receipt-grand"><span>Total</span><span>{rupiah(transaction.total)}</span></div>
      <div className="receipt-total"><span>Bayar ({payment})</span><span>{rupiah(transaction.total)}</span></div>
      <div className="print-divider" />
      <div className="print-footer">
        {reprint && <p>*** CETAK ULANG STRUK RESMI ***</p>}
        <p>Terima Kasih</p><p>Selamat Datang Kembali</p><p>Kritik dan Saran WA</p><p>0852-8000-4508</p>
      </div>
    </div>
  )
}
