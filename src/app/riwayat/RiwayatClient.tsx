'use client'

import { useState, useEffect } from 'react'
import { Search, Printer, X, Clock, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import Receipt, { type PrinterWidth } from '@/components/Receipt'
import PrinterSetup from '@/components/PrinterSetup'
import PrinterStatusBadge from '@/components/PrinterStatus'
import { printer } from '@/lib/printer/bluetooth'
import { loadPrinterConfig } from '@/lib/printer/storage'

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

interface KasirSesi {
  id: string
  tanggal: string
  ditutupPada: string
  dibukaKembaliPada: string | null
  ditutupOleh: string
  totalTransaksi: number
  totalPendapatan: number
  warungNama: string
  warungKode: string
  warungAlamat?: string | null
  detail?: {
    rekap: { namaMenu: string; kategori: string; qtyTotal: number; pendapatanTotal: number }[]
    transaksi: { nomorMeja: string; total: number; metodePembayaran: string; createdAt: string }[]
    grandTotalQty: number
    totalCash: number
    totalQRIS: number
    totalTransfer: number
    jumlahTransaksi: number
  }
}

interface RiwayatClientProps {
  session: {
    warungNama: string | null
    warungKode: string | null
    warungAlamat?: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  warungAlamat?: string | null
  initialTransaksis: Transaksi[]
  initialKasirSesis: KasirSesi[]
  initialStartDate?: string
  initialEndDate?: string
}

export default function RiwayatClient({ session, warungAlamat, initialTransaksis, initialKasirSesis, initialStartDate, initialEndDate }: RiwayatClientProps) {
  const [transaksis] = useState<Transaksi[]>(initialTransaksis)
  const [kasirSesis] = useState<KasirSesi[]>(initialKasirSesis)
  const [search, setSearch] = useState('')
  const [selectedTransaksi, setSelectedTransaksi] = useState<Transaksi | null>(null)
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>('80mm')
  const [showPrinterSetup, setShowPrinterSetup] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState<'sesi' | 'transaksi'>('sesi')
  const [expandedSesi, setExpandedSesi] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadPrinterConfig()
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
                @page { size: auto; margin: 0; }
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
                .print-header { text-align: center; margin-bottom: 3px; }
                .receipt-logo { display: block; width: 1.7cm; height: 1.7cm; object-fit: contain; margin: 0 auto 3px; }
                .receipt-socials { text-align: center; }
                .receipt-socials p { display: block; margin: 0; text-align: center; }
                .print-header h2 { font-size: 18px; text-transform: uppercase; margin: 0 0 2px; line-height: 1.3; }
                .print-header p { font-size: 14px; margin: 0; line-height: 1.3; }
                .print-divider { border: none; border-top: 1px dashed black; margin: 3px 0; }
                .receipt-meta { text-align: center; margin: 2px 0; line-height: 1.4; }
                .receipt-meta div { margin: 0; }
                .receipt-items { text-align: center; }
                .receipt-item-block { margin: 2px 0; text-align: center; }
                .receipt-item-row { display: flex; justify-content: space-between; text-align: center; }
                .receipt-item-detail { font-size: 14px; text-align: center; line-height: 1.4; }
                .receipt-item-note { font-size: 13px; font-style: italic; text-align: center; }
                .receipt-summary { margin-top: 3px; }
                .receipt-row { display: flex; justify-content: space-between; text-align: center; padding: 1px 0; line-height: 1.4; }
                .receipt-grand { font-size: 17px; }
                .print-footer { text-align: center; margin-top: 3px; margin-bottom: 0; padding-bottom: 0; font-size: 14px; line-height: 1.4; }
                .print-footer p { margin: 0; line-height: 1.4; }
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

  const filteredSesis = kasirSesis.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.warungNama.toLowerCase().includes(q) ||
      s.warungKode.toLowerCase().includes(q) ||
      s.ditutupOleh.toLowerCase().includes(q) ||
      s.tanggal.includes(q)
    )
  })

  const totalPendapatanKeseluruhan = kasirSesis.reduce((sum, s) => sum + s.totalPendapatan, 0)
  const totalTransaksiKeseluruhan = kasirSesis.reduce((sum, s) => sum + s.totalTransaksi, 0)

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Riwayat Keuangan</h1>
          <p className="text-secondary text-sm">{kasirSesis.length} sesi kasir • {transaksis.length} transaksi selesai • {session.role === 'OWNER' ? 'Semua cabang' : `Cabang: ${session.warungKode}`}</p>
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
              placeholder="Cari kasir, warung, atau tanggal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('sesi')}
          className={`btn btn-sm ${activeTab === 'sesi' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Clock size={14} /> Sesi Kasir ({kasirSesis.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transaksi')}
          className={`btn btn-sm ${activeTab === 'transaksi' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <TrendingUp size={14} /> Transaksi ({transaksis.length})
        </button>
      </div>

      <div className="no-print">
        {activeTab === 'sesi' ? (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-brand)', fontFamily: "var(--font-fraunces), serif" }}>
                  {kasirSesis.length}
                </div>
                <div className="text-sm text-muted">Total Sesi Kasir</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif" }}>
                  {totalTransaksiKeseluruhan}
                </div>
                <div className="text-sm text-muted">Total Transaksi</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                  Rp {totalPendapatanKeseluruhan.toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-muted">Total Pendapatan</div>
              </div>
            </div>

            {kasirSesis.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <h3>Belum Ada Sesi Kasir</h3>
                <p className="text-secondary text-sm">Riwayat sesi kasir (buka/tutup) akan muncul di sini.</p>
              </div>
            ) : filteredSesis.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p className="text-secondary">Tidak ada sesi kasir yang cocok dengan &quot;{search}&quot;.</p>
                <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredSesis.map((sesi) => {
                  const tanggal = new Date(sesi.tanggal + 'T00:00:00')
                  const tanggalStr = tanggal.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  const ditutupStr = new Date(sesi.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  const dibukaStr = sesi.dibukaKembaliPada ? new Date(sesi.dibukaKembaliPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
                  const isExpanded = expandedSesi === sesi.id
                  const d = sesi.detail
                  return (
                    <div key={sesi.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      {/* Header - clickable */}
                      <button
                        type="button"
                        onClick={() => setExpandedSesi(isExpanded ? null : sesi.id)}
                        style={{ width: '100%', padding: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ flex: '1 1 300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '6px' }}>
                            {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />}
                            <span className="badge badge-brand" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                              {sesi.warungKode}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tanggalStr}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginLeft: '1.5rem' }}>
                            <div>Ditutup oleh: <strong style={{ color: 'var(--color-text-primary)' }}>{sesi.ditutupOleh}</strong> pada {ditutupStr}</div>
                            {dibukaStr && <div>Dibuka kembali: {dibukaStr}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-end' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="text-xs text-muted">{sesi.totalTransaksi} transaksi</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                              Rp {sesi.totalPendapatan.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && d && (
                        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem', background: 'var(--color-surface-raised)' }}>
                          {/* Info sesi */}
                          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            <div><strong>Tanggal:</strong> {tanggalStr}</div>
                            <div><strong>Cabang:</strong> {sesi.warungNama} ({sesi.warungKode})</div>
                            <div><strong>Ditutup oleh:</strong> {sesi.ditutupOleh} pada {ditutupStr}</div>
                            {dibukaStr && <div><strong>Dibuka kembali:</strong> {dibukaStr}</div>}
                          </div>

                          {/* Detail Kasir */}
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>DETAIL KASIR</h4>
                            <div style={{ borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)', padding: '0.5rem 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <strong>Buka Kasir</strong>
                                <span>{dibukaStr || '-'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <strong>Tutup Kasir</strong>
                                <span>{ditutupStr}</span>
                              </div>
                            </div>
                          </div>

                          {/* Daftar Transaksi */}
                          {d.transaksi.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>DAFTAR TRANSAKSI</h4>
                              <div style={{ borderTop: '1px dashed var(--color-border)', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px dashed var(--color-border)' }}>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--color-text-muted)' }}>MEJA</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--color-text-muted)' }}>WAKTU</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--color-text-muted)' }}>METODE</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>TOTAL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d.transaksi.map((tx, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{tx.nomorMeja}</td>
                                        <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                          <span className={`badge ${tx.metodePembayaran === 'QRIS' ? 'badge-warning' : tx.metodePembayaran === 'TRANSFER' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                                            {tx.metodePembayaran === 'QRIS' ? 'QRIS' : tx.metodePembayaran === 'TRANSFER' ? 'TRSF' : 'CASH'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{tx.total.toLocaleString('id-ID')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Rekap Menu */}
                          {d.rekap.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>REKAP MENU</h4>
                              <div style={{ borderTop: '1px dashed var(--color-border)', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px dashed var(--color-border)' }}>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--color-text-muted)' }}>MENU</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>QTY</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>TOTAL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d.rekap.map((item, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{item.namaMenu}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.qtyTotal}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                                          Rp {item.pendapatanTotal.toLocaleString('id-ID')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Total Per Metode Bayar */}
                          <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>TOTAL PER METODE BAYAR</h4>
                            <div style={{ borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)', padding: '0.5rem 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <span>CASH</span>
                                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp {d.totalCash.toLocaleString('id-ID')}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <span>QRIS</span>
                                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp {d.totalQRIS.toLocaleString('id-ID')}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <span>TRANSFER</span>
                                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp {d.totalTransfer.toLocaleString('id-ID')}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Summary */}
                          <div>
                            <div style={{ borderTop: '1px dashed var(--color-border)', padding: '0.5rem 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <span>Total Qty:</span>
                                <strong>{d.grandTotalQty} item</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                                <span>Total Transaksi:</span>
                                <strong>{d.jumlahTransaksi} transaksi</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.5rem 0', borderTop: '2px solid var(--color-border)', marginTop: '0.25rem' }}>
                                <span>GRAND TOTAL:</span>
                                <strong style={{ color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                                  Rp {sesi.totalPendapatan.toLocaleString('id-ID')}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
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
                          <span className={`badge ${trx.metodePembayaran === 'QRIS' ? 'badge-warning' : trx.metodePembayaran === 'TRANSFER' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                            {trx.metodePembayaran === 'QRIS' ? 'QRIS' : trx.metodePembayaran === 'TRANSFER' ? 'Transfer' : 'Cash'}
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
          </>
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

            <Receipt transaction={selectedTransaksi} cashier={session.namaLengkap || session.username} username={session.username} warungKode={session.warungKode} warungNama={session.warungNama} warungAlamat={warungAlamat} width={printerWidth} preview reprint />
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

      <PrinterSetup open={showPrinterSetup} onClose={() => setShowPrinterSetup(false)} onConfigured={(config) => { if (config) setPrinterWidth(config.width) }} />

      {selectedTransaksi && <Receipt transaction={selectedTransaksi} cashier={session.namaLengkap || session.username} username={session.username} warungKode={session.warungKode} warungNama={session.warungNama} warungAlamat={warungAlamat} width={printerWidth} reprint />}
    </div>
  )
}
