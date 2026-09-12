'use client'

import { useState, useEffect } from 'react'
import { Search, Printer, X } from 'lucide-react'
import Receipt, { type PrinterWidth, type ReceiptTransaction } from '@/components/Receipt'
import PrinterSetup from '@/components/PrinterSetup'
import PrinterStatusBadge from '@/components/PrinterStatus'
import { printer } from '@/lib/printer/bluetooth'
import { loadPrinterConfig } from '@/lib/printer/storage'
import { encodeReceipt } from '@/lib/printer/receipt-encoder'
import type { PrinterConfig } from '@/lib/printer/types'

interface TransaksiItem {
  id: string
  namaMenu: string
  hargaSatuan: number
  diskonSatuan?: number
  catatan?: string | null
  qty: number
  subtotal: number
}

interface Transaksi {
  id: string
  nomorMeja: string
  total: number
  metodePembayaran?: string | null
  tanggal: string
  createdAt: string
  items: TransaksiItem[]
}

interface RiwayatClientProps {
  session: {
    warungNama: string | null
    warungKode: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  initialTransaksis: Transaksi[]
  initialStartDate?: string
  initialEndDate?: string
}

export default function RiwayatClient({ session, initialTransaksis, initialStartDate, initialEndDate }: RiwayatClientProps) {
  const [transaksis] = useState<Transaksi[]>(initialTransaksis)
  const [search, setSearch] = useState('')
  const [selectedTransaksi, setSelectedTransaksi] = useState<Transaksi | null>(null)
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>('80mm')
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null)
  const [showPrinterSetup, setShowPrinterSetup] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const saved = loadPrinterConfig()
    if (saved) {
      setPrinterConfig(saved)
      setPrinterWidth(saved.width)
      printer.autoReconnect()
    }
  }, [])

  const filtered = transaksis.filter((t) => {
    const matchMeja = t.nomorMeja.toLowerCase().includes(search.toLowerCase())
    const matchId = t.id.toLowerCase().includes(search.toLowerCase())
    const matchItem = t.items.some((i) => i.namaMenu.toLowerCase().includes(search.toLowerCase()))
    return matchMeja || matchId || matchItem
  })

  async function handlePrintReceipt() {
    if (selectedTransaksi) {
      setPrinting(true)
      try {
        const printWindow = window.open('', '_blank', 'width=280,height=500')
        if (printWindow) {
          const receiptEl = document.querySelector('.print-receipt')
          const receiptHTML = receiptEl ? receiptEl.outerHTML : ''
          
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Cetak Struk</title>
              <style>
                @page { size: A6; margin: 0; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body { width: 100%; margin: 0; padding: 0; }
                body {
                  width: 100%; margin: 0; padding: 0 2mm;
                  font-family: 'Helvetica', 'Arial', sans-serif;
                  font-size: 15px; font-weight: bold;
                  color: black; background: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-receipt { width: 100%; padding: 0 2mm; text-align: center; }
                .print-header { text-align: center; margin-bottom: 6px; }
                .print-header h2 { font-size: 18px; text-transform: uppercase; margin: 0 0 3px; line-height: 1.4; }
                .print-header p { font-size: 14px; margin: 1px 0; line-height: 1.4; }
                .print-divider { border: none; border-top: 1px dashed black; margin: 6px 0; }
                .receipt-meta { text-align: center; margin: 4px 0; line-height: 1.6; }
                .receipt-meta div { margin: 1px 0; }
                .receipt-items { text-align: center; }
                .receipt-item-block { margin: 4px 0; text-align: center; }
                .receipt-item-row { display: flex; justify-content: space-between; text-align: center; }
                .receipt-item-detail { font-size: 14px; text-align: center; line-height: 1.5; }
                .receipt-item-note { font-size: 13px; font-style: italic; text-align: center; }
                .receipt-summary { margin-top: 6px; }
                .receipt-row { display: flex; justify-content: space-between; text-align: center; padding: 2px 0; line-height: 1.6; }
                .receipt-grand { font-size: 17px; }
                .receipt-grand-section { margin-top: 6px; }
                .print-footer { text-align: center; margin-top: 6px; font-size: 14px; line-height: 1.6; }
                .print-footer p { margin: 1px 0; line-height: 1.6; }
                @media print { body { width: 100%; } .print-receipt { width: 100%; } }
              </style>
            </head>
            <body>${receiptHTML}</body>
            </html>
          `)
          printWindow.document.close()
          printWindow.focus()
          setTimeout(() => { printWindow.print() }, 300)
        }
      } catch (e) {
        console.error('Print error:', e)
        alert(`Gagal mencetak: ${e instanceof Error ? e.message : 'Unknown error'}`)
      } finally {
        setPrinting(false)
      }
    }
  }

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Riwayat Penjualan</h1>
          <p className="text-secondary text-sm">{transaksis.length} transaksi selesai • {session.role === 'OWNER' ? 'Semua cabang' : `Cabang: ${session.warungKode}`}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" name="mulai" aria-label="Tanggal mulai" defaultValue={initialStartDate} className="form-input" />
            <span className="text-secondary text-sm">sampai</span>
            <input type="date" name="sampai" aria-label="Tanggal akhir" defaultValue={initialEndDate} className="form-input" />
            <button type="submit" className="btn btn-ghost btn-sm">Filter tanggal</button>
            {(initialStartDate || initialEndDate) && <a href="/riwayat" className="btn btn-ghost btn-sm">Semua waktu</a>}
          </form>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari meja, menu, atau ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      <div className="no-print">
        {transaksis.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <h3>Belum Ada Transaksi</h3>
            <p className="text-secondary text-sm">Transaksi selesai dari semua waktu akan tersimpan dan dapat dicetak ulang di halaman ini.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <p className="text-secondary">Tidak ada transaksi yang cocok dengan &quot;{search}&quot;.</p>
            <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((trx) => {
              const timeStr = new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={trx.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '6px' }}>
                      <span className="badge badge-brand" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                        {trx.nomorMeja}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{timeStr}</span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                        #{trx.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                      {trx.items.map((it, idx) => (
                        <span key={it.id}>
                          {it.namaMenu} <strong style={{ color: 'var(--color-text-primary)' }}>({it.qty})</strong>
                          {idx < trx.items.length - 1 ? ' • ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-xs text-muted">Total Pembayaran</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                        Rp {trx.total.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedTransaksi(trx)} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Printer size={14} /> Cetak Struk
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Preview Struk */}
      {selectedTransaksi && (
        <div className="modal-overlay no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTransaksi(null) }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Cetak Ulang Struk</h3>
              <button onClick={() => setSelectedTransaksi(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <Receipt transaction={selectedTransaksi} cashier={session.namaLengkap || session.username} warungNama={session.warungNama} width={printerWidth} preview reprint />
            <div className="receipt-width-picker">
              <span>Ukuran printer</span>
              {(['58mm', '80mm'] as const).map((width) => <button key={width} type="button" onClick={() => setPrinterWidth(width)} className={`btn btn-sm ${printerWidth === width ? 'btn-primary' : 'btn-ghost'}`}>{width}</button>)}
              <PrinterStatusBadge onSetupClick={() => setShowPrinterSetup(true)} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedTransaksi(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Tutup</button>
              <button type="button" onClick={handlePrintReceipt} disabled={printing} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                <Printer size={16} /> {printing ? 'Mencetak...' : 'Cetak'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PrinterSetup open={showPrinterSetup} onClose={() => setShowPrinterSetup(false)} onConfigured={(config) => { setPrinterConfig(config); if (config) setPrinterWidth(config.width) }} />

      {selectedTransaksi && <Receipt transaction={selectedTransaksi} cashier={session.namaLengkap || session.username} warungNama={session.warungNama} width={printerWidth} reprint />}
    </div>
  )
}
