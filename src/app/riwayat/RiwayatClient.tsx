'use client'

import { useState } from 'react'
import { Search, Printer, X } from 'lucide-react'

interface TransaksiItem {
  id: string
  namaMenu: string
  hargaSatuan: number
  qty: number
  subtotal: number
}

interface Transaksi {
  id: string
  nomorMeja: string
  total: number
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
  }
  initialTransaksis: Transaksi[]
}

export default function RiwayatClient({ session, initialTransaksis }: RiwayatClientProps) {
  const [transaksis] = useState<Transaksi[]>(initialTransaksis)
  const [search, setSearch] = useState('')
  const [selectedTransaksi, setSelectedTransaksi] = useState<Transaksi | null>(null)

  const filtered = transaksis.filter((t) => {
    const matchMeja = t.nomorMeja.toLowerCase().includes(search.toLowerCase())
    const matchId = t.id.toLowerCase().includes(search.toLowerCase())
    const matchItem = t.items.some((i) => i.namaMenu.toLowerCase().includes(search.toLowerCase()))
    return matchMeja || matchId || matchItem
  })

  function handlePrintReceipt() { window.print() }

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Riwayat Transaksi Hari Ini</h1>
          <p className="text-secondary text-sm">Daftar pesanan tercatat hari ini • Cabang: {session.warungKode}</p>
        </div>
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

      <div className="no-print">
        {transaksis.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <h3>Belum Ada Transaksi Hari Ini</h3>
            <p className="text-secondary text-sm">Semua transaksi yang dibuat hari ini akan tersimpan dan dapat dicetak ulang di halaman ini.</p>
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
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "'Fraunces', serif", fontVariantNumeric: 'tabular-nums' }}>
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

            <div style={{ background: '#ffffff', color: '#000000', padding: '1.25rem', borderRadius: '8px', fontFamily: "'Courier New', Courier, monospace", fontSize: '11px', lineHeight: '1.4', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: '1.25rem', maxHeight: '340px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px', display: 'block', textTransform: 'uppercase' }}>{session.warungNama}</strong>
                <span style={{ fontSize: '9px' }}>Cabang: {session.warungKode}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>No. Trx: #{selectedTransaksi.id.slice(0, 8).toUpperCase()}</span>
                <span>{selectedTransaksi.nomorMeja}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>
                  {new Date(selectedTransaksi.createdAt).toLocaleDateString('id-ID')}{' '}
                  {new Date(selectedTransaksi.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Kasir: {session.namaLengkap || session.username}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <tbody>
                  {selectedTransaksi.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                        <div>{item.namaMenu}</div>
                        <div style={{ color: '#555', fontSize: '9px' }}>{item.qty} x {item.hargaSatuan.toLocaleString('id-ID')}</div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'bottom', padding: '2px 0' }}>Rp {item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '1px solid #000', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                <span>TOTAL</span>
                <span>Rp {selectedTransaksi.total.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>*** CETAK ULANG STRUK RESMI ***</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedTransaksi(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Tutup</button>
              <button type="button" onClick={handlePrintReceipt} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                <Printer size={16} /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTransaksi && (
        <div className="print-only print-receipt">
          <div className="print-header">
            <h2>{session.warungNama}</h2>
            <p>Cabang: {session.warungKode}</p>
          </div>
          <div className="print-divider" />
          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>No: #{selectedTransaksi.id.slice(0, 8).toUpperCase()}</span>
            <span>{selectedTransaksi.nomorMeja}</span>
          </div>
          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {new Date(selectedTransaksi.createdAt).toLocaleDateString('id-ID')}{' '}
              {new Date(selectedTransaksi.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>Kasir: {session.namaLengkap || session.username}</span>
          </div>
          <div className="print-divider" />
          <table className="print-table">
            <thead><tr><th>ITEM</th><th className="text-right">TOTAL</th></tr></thead>
            <tbody>
              {selectedTransaksi.items.map((item, idx) => (
                <tr key={idx}>
                  <td><div>{item.namaMenu}</div><div style={{ fontSize: '9px' }}>{item.qty} x {item.hargaSatuan.toLocaleString('id-ID')}</div></td>
                  <td className="text-right" style={{ verticalAlign: 'bottom' }}>{item.subtotal.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-total">
            <div className="print-total-row grand"><span>TOTAL</span><span>Rp {selectedTransaksi.total.toLocaleString('id-ID')}</span></div>
          </div>
          <div className="print-divider" />
          <div className="print-footer">
            <p>*** CETAK ULANG STRUK RESMI ***</p>
            <p>Terima kasih atas kunjungan Anda!</p>
          </div>
        </div>
      )}
    </div>
  )
}
