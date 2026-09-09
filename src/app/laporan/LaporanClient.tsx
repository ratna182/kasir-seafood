'use client'

import { useState, useEffect } from 'react'

interface RekapItem {
  namaMenu: string
  kategori: string
  qtyTotal: number
  pendapatanTotal: number
}

interface LaporanData {
  tanggal: string
  warung: {
    id: string
    nama: string
    kode: string
  }
  rekap: RekapItem[]
  grandTotalQty: number
  grandTotalPendapatan: number
  jumlahTransaksi: number
}

interface KasirSesiInfo {
  ditutupPada: string
  ditutupOleh: string
  totalTransaksi: number
  totalPendapatan: number
}

interface LaporanClientProps {
  session: {
    warungNama: string | null
    warungKode: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  initialKasirSesi: KasirSesiInfo | null
}

export default function LaporanClient({ session, initialKasirSesi }: LaporanClientProps) {
  const [data, setData] = useState<LaporanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [kasirSesi, setKasirSesi] = useState<KasirSesiInfo | null>(initialKasirSesi)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchLaporan()
  }, [])

  async function fetchLaporan() {
    setLoading(true)
    try {
      const res = await fetch('/api/laporan/harian')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal memuat laporan' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Koneksi ke server terganggu' })
    } finally {
      setLoading(false)
    }
  }

  async function handleTutupKasir() {
    setClosing(true)
    try {
      const res = await fetch('/api/kasir/tutup', { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        setKasirSesi({
          ditutupPada: result.data.ditutupPada,
          ditutupOleh: session.namaLengkap || session.username,
          totalTransaksi: result.data.totalTransaksi,
          totalPendapatan: result.data.totalPendapatan,
        })
        setShowCloseModal(false)
        setFeedback({
          type: 'success',
          message: 'Kasir hari ini telah berhasil ditutup! Anda dapat mencetak laporan penutupan sekarang.',
        })
        fetchLaporan()
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal menutup kasir' })
        setShowCloseModal(false)
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem saat menutup kasir' })
      setShowCloseModal(false)
    } finally {
      setClosing(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleExportExcel() {
    try {
      const res = await fetch('/api/laporan/export')
      if (!res.ok) throw new Error('Gagal export')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setFeedback({ type: 'success', message: 'Berhasil download laporan Excel!' })
    } catch {
      setFeedback({ type: 'error', message: 'Gagal export laporan Excel' })
    }
  }

  async function handleExportPDF() {
    try {
      const res = await fetch('/api/laporan/export/pdf')
      if (!res.ok) throw new Error('Gagal export')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setFeedback({ type: 'success', message: 'Berhasil download laporan PDF!' })
    } catch {
      setFeedback({ type: 'error', message: 'Gagal export laporan PDF' })
    }
  }

  const now = new Date()
  const todayStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Header Halaman */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            Laporan Penjualan Harian 📊
          </h1>
          <p className="text-secondary text-sm">
            {todayStr} • Cabang: {session.warungKode}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="btn-export-excel"
            onClick={handleExportExcel}
            disabled={loading || !data || data.rekap.length === 0}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>📊</span>
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            id="btn-export-pdf"
            onClick={handleExportPDF}
            disabled={loading || !data || data.rekap.length === 0}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>📄</span>
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            id="btn-cetak-laporan"
            onClick={handlePrint}
            disabled={loading || !data || data.rekap.length === 0}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>🖨️</span>
            <span>Cetak Laporan (80mm)</span>
          </button>

          {!kasirSesi ? (
            <button
              type="button"
              id="btn-tutup-kasir"
              onClick={() => setShowCloseModal(true)}
              disabled={loading}
              className="btn btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🔒</span>
              <span>Tutup Kasir Hari Ini</span>
            </button>
          ) : (
            <div
              className="badge badge-warning"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
              }}
            >
              <span>🔒</span>
              <span>Kasir Sudah Ditutup</span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`alert no-print ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Status Kasir Alert */}
      {kasirSesi ? (
        <div className="alert alert-warning no-print" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔒</span>
          <div>
            <strong>Status Kasir: Ditutup</strong>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Shift kasir hari ini telah resmi ditutup pada{' '}
              <strong>
                {new Date(kasirSesi.ditutupPada).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              oleh <strong>{kasirSesi.ditutupOleh}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="alert alert-success no-print" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <div>
            <strong>Status Kasir: Buka</strong>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Kasir aktif beroperasi menerima pesanan. Anda dapat menutup shift kasir di akhir hari.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>🧾</div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-primary)',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {data ? data.jumlahTransaksi : '...'}
          </div>
          <div className="text-sm text-muted">Jumlah Transaksi</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>📦</div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-accent)',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {data ? data.grandTotalQty : '...'}
          </div>
          <div className="text-sm text-muted">Total Porsi / Item Terjual</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>💰</div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--color-success)',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {data ? `Rp ${data.grandTotalPendapatan.toLocaleString('id-ID')}` : '...'}
          </div>
          <div className="text-sm text-muted">Total Pendapatan Hari Ini</div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="no-print">
        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p className="text-secondary">Menghitung rekapitulasi data penjualan...</p>
          </div>
        ) : !data || data.rekap.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
            <h3>Belum Ada Transaksi Hari Ini</h3>
            <p className="text-secondary text-sm" style={{ maxWidth: '400px', margin: '0 auto' }}>
              Saat kasir mencatat transaksi pesanan baru, rekapitulasi menu dan pendapatan akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                Rincian Penjualan Per Menu
              </h2>
              <span className="text-xs text-secondary">
                {data.rekap.length} jenis menu terjual
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Nama Menu
                    </th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Kategori
                    </th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Qty Terjual
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      Subtotal (Rp)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rekap.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'var(--transition)',
                      }}
                    >
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>
                        {item.namaMenu}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              item.kategori === 'MAKANAN'
                                ? 'rgba(249, 115, 22, 0.15)'
                                : 'rgba(6, 182, 212, 0.15)',
                            color:
                              item.kategori === 'MAKANAN'
                                ? 'var(--color-primary)'
                                : 'var(--color-accent)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {item.kategori === 'MAKANAN' ? '🍤 Makanan' : '🥤 Minuman'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                        {item.qtyTotal}
                      </td>
                      <td
                        style={{
                          padding: '0.9rem 1.25rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        Rp {item.pendapatanTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      background: 'var(--color-surface-2)',
                      borderTop: '2px solid var(--color-border)',
                      fontWeight: 800,
                    }}
                  >
                    <td colSpan={2} style={{ padding: '1rem 1.25rem', fontSize: '0.95rem' }}>
                      GRAND TOTAL
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.1rem', color: 'var(--color-accent)' }}>
                      {data.grandTotalQty}
                    </td>
                    <td
                      style={{
                        padding: '1rem 1.25rem',
                        textAlign: 'right',
                        fontSize: '1.25rem',
                        color: 'var(--color-success)',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      Rp {data.grandTotalPendapatan.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TUTUP KASIR CONFIRMATION */}
      {showCloseModal && (
        <div
          className="modal-overlay no-print"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-danger)',
              animation: 'scaleUp 0.2s ease',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px', color: 'var(--color-danger)' }}>
                Konfirmasi Tutup Kasir
              </h2>
              <p className="text-secondary text-sm">
                Apakah Anda yakin ingin menutup kasir hari ini?
              </p>
            </div>

            <div
              style={{
                padding: '1rem',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                lineHeight: '1.5',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-secondary">Total Transaksi:</span>
                <strong>{data?.jumlahTransaksi || 0} transaksi</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="text-secondary">Total Pendapatan:</span>
                <strong style={{ color: 'var(--color-success)' }}>
                  Rp {(data?.grandTotalPendapatan || 0).toLocaleString('id-ID')}
                </strong>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '8px',
                  color: 'var(--color-warning)',
                  fontSize: '0.8rem',
                }}
              >
                ⚠️ <strong>Perhatian:</strong> Setelah ditutup, transaksi baru <strong>tidak dapat dibuat</strong> hingga esok hari.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={closing}
                className="btn btn-ghost"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-tutup-kasir"
                onClick={handleTutupKasir}
                disabled={closing}
                className="btn btn-danger"
                style={{ minWidth: '130px', justifyContent: 'center' }}
              >
                {closing ? 'Memproses...' : 'Ya, Tutup Kasir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY THERMAL CLOSING REPORT (80mm) */}
      {data && (
        <div className="print-only print-receipt">
          <div className="print-header">
            <h2>LAPORAN PENJUALAN HARIAN</h2>
            <p>{session.warungNama}</p>
            <p>Kode Cabang: {session.warungKode}</p>
          </div>

          <div className="print-divider" />

          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tanggal: {data.tanggal}</span>
            <span>Shift: Hari Ini</span>
          </div>
          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Dicetak: {new Date().toLocaleTimeString('id-ID')}</span>
            <span>Kasir: {session.namaLengkap || session.username}</span>
          </div>
          {kasirSesi && (
            <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Status: SUDAH DITUTUP</span>
              <span>
                Pkl:{' '}
                {new Date(kasirSesi.ditutupPada).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="print-divider" />

          <table className="print-table">
            <thead>
              <tr>
                <th>MENU</th>
                <th className="text-right">QTY</th>
                <th className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.rekap.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.namaMenu}</td>
                  <td className="text-right">{item.qtyTotal}</td>
                  <td className="text-right">
                    {item.pendapatanTotal.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-total">
            <div className="print-total-row">
              <span>Total Qty:</span>
              <span>{data.grandTotalQty} item</span>
            </div>
            <div className="print-total-row">
              <span>Total Transaksi:</span>
              <span>{data.jumlahTransaksi} transaksi</span>
            </div>
            <div className="print-total-row grand">
              <span>GRAND TOTAL:</span>
              <span>Rp {data.grandTotalPendapatan.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="print-divider" />

          <div className="print-footer">
            <p>*** REKAPITULASI PENJUALAN RESMI ***</p>
            <p>Kasir Vian Jaya 08</p>
          </div>
        </div>
      )}
    </div>
  )
}
