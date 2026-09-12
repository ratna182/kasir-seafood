'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText, Printer, Lock, AlertTriangle } from 'lucide-react'
import PrinterSetup from '@/components/PrinterSetup'
import PrinterStatusBadge from '@/components/PrinterStatus'
import { printer } from '@/lib/printer/bluetooth'
import { loadPrinterConfig } from '@/lib/printer/storage'
import { encodeLaporan, type LaporanData } from '@/lib/printer/laporan-encoder'
import type { PrinterConfig } from '@/lib/printer/types'

interface RekapItem {
  namaMenu: string
  kategori: string
  qtyTotal: number
  pendapatanTotal: number
}

interface LaporanDataLocal {
  tanggal: string
  warung: { id: string; nama: string; kode: string }
  rekap: RekapItem[]
  grandTotalQty: number
  grandTotalPendapatan: number
  jumlahTransaksi: number
  totalCash: number
  totalQRIS: number
  totalTransfer: number
}

interface KasirSesiInfo {
  ditutupPada: string
  ditutupOleh: string
  totalTransaksi: number
  totalPendapatan: number
}

interface WarungOption { id: string; nama: string; kode: string }

interface LaporanClientProps {
  session: {
    warungId?: string | null
    warungNama: string | null
    warungKode: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  warungs: WarungOption[]
  initialKasirSesi: KasirSesiInfo | null
}

export default function LaporanClient({ session, warungs, initialKasirSesi }: LaporanClientProps) {
  const [data, setData] = useState<LaporanDataLocal | null>(null)
  const [loading, setLoading] = useState(true)
  const [kasirSesi, setKasirSesi] = useState<KasirSesiInfo | null>(initialKasirSesi)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedWarungId, setSelectedWarungId] = useState(session.warungId || '')
  const isOwner = session.role === 'OWNER'
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null)
  const [showPrinterSetup, setShowPrinterSetup] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('80mm')

  useEffect(() => {
    const saved = loadPrinterConfig()
    if (saved) {
      setPrinterConfig(saved)
      setPrinterWidth(saved.width)
      printer.autoReconnect()
    }
  }, [])

  useEffect(() => {
    if (isOwner && !selectedWarungId) return
    fetchLaporan()
  }, [selectedWarungId])

  async function fetchLaporan() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isOwner && selectedWarungId) params.set('warung_id', selectedWarungId)
      const qs = params.toString()
      const res = await fetch(`/api/laporan/harian${qs ? '?' + qs : ''}`)
      const result = await res.json()
      if (result.success) setData(result.data)
      else setFeedback({ type: 'error', message: result.message || 'Gagal memuat laporan' })
    } catch {
      setFeedback({ type: 'error', message: 'Koneksi ke server terganggu' })
    } finally { setLoading(false) }
  }

  async function handleTutupKasir() {
    setClosing(true)
    try {
      const res = await fetch('/api/kasir/tutup', { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        setKasirSesi({ ditutupPada: result.data.ditutupPada, ditutupOleh: session.namaLengkap || session.username, totalTransaksi: result.data.totalTransaksi, totalPendapatan: result.data.totalPendapatan })
        setShowCloseModal(false)
        setFeedback({ type: 'success', message: 'Kasir hari ini telah berhasil ditutup! Anda dapat mencetak laporan penutupan sekarang.' })
        fetchLaporan()
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal menutup kasir' })
        setShowCloseModal(false)
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem saat menutup kasir' })
      setShowCloseModal(false)
    } finally { setClosing(false) }
  }

  async function handleBukaKasir() {
    if (!confirm('Yakin ingin membuka kasir hari ini? Kasir akan bisa bertransaksi lagi.')) return
    setOpening(true)
    try {
      const warungId = isOwner ? selectedWarungId : session.warungId
      const res = await fetch('/api/kasir/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warungId }),
      })
      const result = await res.json()
      if (result.success) {
        setKasirSesi(null)
        setFeedback({ type: 'success', message: 'Kasir hari ini berhasil dibuka kembali!' })
        fetchLaporan()
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal membuka kasir' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem saat membuka kasir' })
    } finally { setOpening(false) }
  }

  function handlePrint() {
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
          <title>Cetak Laporan</title>
          <style>
            @page { margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { width: 72mm; margin: 0; padding: 0; }
            body {
              width: 72mm; margin: 0; padding: 1mm 2mm;
              font-family: 'Helvetica', 'Arial', sans-serif;
              font-size: 11px; font-weight: bold;
              color: black; background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-receipt { width: 72mm; padding: 1mm 2mm; }
            .print-header { text-align: center; margin-bottom: 2px; }
            .print-header h2 { font-size: 13px; text-transform: uppercase; margin: 0; line-height: 1.2; }
            .print-divider { border: none; border-top: 1px dashed black; margin: 2px 0; }
            .receipt-meta { text-align: center; margin: 1px 0; line-height: 1.2; }
            .receipt-items { text-align: left; }
            .receipt-item-row { display: flex; justify-content: space-between; padding: 0.5px 0; line-height: 1.2; font-size: 10px; }
            .receipt-item-row span:first-child { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .receipt-item-row span:last-child { text-align: right; min-width: 70px; }
            .receipt-summary { margin-top: 2px; }
            .receipt-row { display: flex; justify-content: space-between; padding: 0.5px 0; line-height: 1.2; font-size: 10px; }
            .receipt-grand { font-size: 12px; font-weight: 800; }
            .print-footer { text-align: center; margin-top: 2px; font-size: 9px; line-height: 1.2; }
            .print-footer p { margin: 0; }
            .print-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 2px; }
            .print-table th, .print-table td { padding: 0.5px 0; line-height: 1.2; }
            .print-table th { border-bottom: 1px dashed black; font-size: 9px; }
            .text-right { text-align: right; }
            .print-total { margin-top: 2px; border-top: 1px dashed black; padding-top: 2px; }
            .print-total-row { display: flex; justify-content: space-between; font-size: 10px; line-height: 1.3; }
            .print-total-row.grand { font-size: 12px; font-weight: 800; margin-top: 1px; }
            @media print { body { width: 72mm; } .print-receipt { width: 72mm; } }
          </style>
        </head>
        <body>${receiptHTML}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print() }, 300)
    }
  }

  async function handlePrintThermal() {
    handlePrint()
  }

  async function handleExportExcel() {
    try {
      const params = new URLSearchParams()
      if (isOwner && selectedWarungId) params.set('warung_id', selectedWarungId)
      else if (session.warungId) params.set('warung_id', session.warungId)
      const qs = params.toString()
      const res = await fetch(`/api/laporan/export${qs ? '?' + qs : ''}`)
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
    } catch { setFeedback({ type: 'error', message: 'Gagal export laporan Excel' }) }
  }

  async function handleExportPDF() {
    try {
      const params = new URLSearchParams()
      if (isOwner && selectedWarungId) params.set('warung_id', selectedWarungId)
      else if (session.warungId) params.set('warung_id', session.warungId)
      const qs = params.toString()
      const res = await fetch(`/api/laporan/export/pdf${qs ? '?' + qs : ''}`)
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
    } catch { setFeedback({ type: 'error', message: 'Gagal export laporan PDF' }) }
  }

  const now = new Date()
  const todayStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Laporan Penjualan Harian</h1>
          <p className="text-secondary text-sm">
            {todayStr}
            {isOwner ? (selectedWarungId && data?.warung ? ` • ${data.warung.nama}` : '') : ` • Cabang: ${session.warungKode}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isOwner && (
            <select className="form-input" value={selectedWarungId} onChange={(e) => setSelectedWarungId(e.target.value)} style={{ minWidth: '200px' }}>
              <option value="">Pilih Warung...</option>
              {warungs.map((w) => (<option key={w.id} value={w.id}>{w.nama} ({w.kode})</option>))}
            </select>
          )}
          <button type="button" id="btn-export-excel" onClick={handleExportExcel} disabled={loading || !data || data.rekap.length === 0} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button type="button" id="btn-export-pdf" onClick={handleExportPDF} disabled={loading || !data || data.rekap.length === 0} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Export PDF
          </button>
          <button type="button" id="btn-cetak-laporan" onClick={handlePrintThermal} disabled={loading || !data || data.rekap.length === 0 || printing} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={16} /> {printing ? 'Mencetak...' : 'Cetak Laporan'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {(['58mm', '80mm'] as const).map((w) => (
              <button key={w} type="button" onClick={() => setPrinterWidth(w)} className={`btn btn-sm ${printerWidth === w ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                {w}
              </button>
            ))}
          </div>
          <PrinterStatusBadge onSetupClick={() => setShowPrinterSetup(true)} />
          {!kasirSesi ? (
            <button type="button" id="btn-tutup-kasir" onClick={() => setShowCloseModal(true)} disabled={loading} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> Tutup Kasir Hari Ini
            </button>
          ) : (
            <button type="button" id="btn-buka-kasir" onClick={handleBukaKasir} disabled={opening} className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> {opening ? 'Membuka...' : 'Buka Kasir Lagi'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`alert no-print ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.25rem' }}>
          <div>{feedback.message}</div>
        </div>
      )}

      {kasirSesi ? (
        <div className="alert alert-warning no-print" style={{ marginBottom: '1.5rem' }}>
          <div>
            <strong>Status Kasir: Ditutup</strong>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Shift kasir hari ini telah resmi ditutup pada{' '}
              <strong>{new Date(kasirSesi.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong>{' '}
              oleh <strong>{kasirSesi.ditutupOleh}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="alert alert-success no-print" style={{ marginBottom: '1.5rem' }}>
          <div>
            <strong>Status Kasir: Buka</strong>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Kasir aktif beroperasi menerima pesanan. Anda dapat menutup shift kasir di akhir hari.</p>
          </div>
        </div>
      )}

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-brand)', fontFamily: "var(--font-fraunces), serif" }}>
            {data ? data.jumlahTransaksi : '...'}
          </div>
          <div className="text-sm text-muted">Jumlah Transaksi</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif" }}>
            {data ? data.grandTotalQty : '...'}
          </div>
          <div className="text-sm text-muted">Total Porsi / Item Terjual</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
            {data ? `Rp ${data.grandTotalPendapatan.toLocaleString('id-ID')}` : '...'}
          </div>
          <div className="text-sm text-muted">Total Pendapatan Hari Ini</div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem', borderLeft: '3px solid var(--color-success)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif" }}>
            {data ? `Rp ${(data.totalCash || 0).toLocaleString('id-ID')}` : '...'}
          </div>
          <div className="text-xs text-muted">Cash</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem', borderLeft: '3px solid var(--color-warning)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: "var(--font-fraunces), serif" }}>
            {data ? `Rp ${(data.totalQRIS || 0).toLocaleString('id-ID')}` : '...'}
          </div>
          <div className="text-xs text-muted">QRIS</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem', borderLeft: '3px solid var(--color-info)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-info)', fontFamily: "var(--font-fraunces), serif" }}>
            {data ? `Rp ${(data.totalTransfer || 0).toLocaleString('id-ID')}` : '...'}
          </div>
          <div className="text-xs text-muted">Transfer</div>
        </div>
      </div>

      <div className="no-print">
        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p className="text-secondary">Menghitung rekapitulasi data penjualan...</p>
          </div>
        ) : !data || data.rekap.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <h3>Belum Ada Transaksi Hari Ini</h3>
            <p className="text-secondary text-sm" style={{ maxWidth: '400px', margin: '0 auto' }}>
              Saat kasir mencatat transaksi pesanan baru, rekapitulasi menu dan pendapatan akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Rincian Penjualan Per Menu</h2>
              <span className="text-xs text-secondary">{data.rekap.length} jenis menu terjual</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Nama Menu</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Kategori</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Qty Terjual</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Subtotal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rekap.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', transition: 'var(--transition)' }}>
                      <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>{item.namaMenu}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span className="badge" style={{ background: item.kategori === 'MAKANAN' ? 'var(--color-brand-light)' : 'var(--color-success-light)', color: item.kategori === 'MAKANAN' ? 'var(--color-brand)' : 'var(--color-success)', fontSize: '0.75rem' }}>
                          {item.kategori === 'MAKANAN' ? 'Makanan' : 'Minuman'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.qtyTotal}</td>
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                        Rp {item.pendapatanTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-raised)', borderTop: '2px solid var(--color-border)', fontWeight: 800 }}>
                    <td colSpan={2} style={{ padding: '1rem 1.25rem', fontSize: '0.95rem' }}>GRAND TOTAL</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.1rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{data.grandTotalQty}</td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1.25rem', color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                      Rp {data.grandTotalPendapatan.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tutup Kasir */}
      {showCloseModal && (
        <div className="modal-overlay no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <AlertTriangle size={40} style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }} />
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px', color: 'var(--color-danger)' }}>Konfirmasi Tutup Kasir</h2>
              <p className="text-secondary text-sm">Apakah Anda yakin ingin menutup kasir hari ini?</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-secondary">Total Transaksi:</span>
                <strong>{data?.jumlahTransaksi || 0} transaksi</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="text-secondary">Total Pendapatan:</span>
                <strong style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>Rp {(data?.grandTotalPendapatan || 0).toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', color: 'var(--color-pending)', fontSize: '0.8rem' }}>
                <strong>Perhatian:</strong> Setelah ditutup, transaksi baru <strong>tidak dapat dibuat</strong> hingga esok hari.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCloseModal(false)} disabled={closing} className="btn btn-ghost">Batal</button>
              <button type="button" id="btn-confirm-tutup-kasir" onClick={handleTutupKasir} disabled={closing} className="btn btn-danger" style={{ minWidth: '130px', justifyContent: 'center' }}>
                {closing ? 'Memproses...' : 'Ya, Tutup Kasir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="print-only print-receipt">
          <div className="print-header">
            <h2>LAPORAN PENJUALAN HARIAN</h2>
            <p>{session.warungNama}</p>
            <p>Kode Cabang: {session.warungKode}</p>
          </div>
          <div className="print-divider" />
          <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tanggal: {data.tanggal}</span>
            <span>Shift: Hari Ini</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>Dicetak: {new Date().toLocaleTimeString('id-ID')}</span>
            <span>Kasir: {session.namaLengkap || session.username}</span>
          </div>
          {kasirSesi && (
            <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Status: SUDAH DITUTUP</span>
              <span>Pkl: {new Date(kasirSesi.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <div className="print-divider" />
          <table className="print-table">
            <thead><tr><th>MENU</th><th className="text-right">QTY</th><th className="text-right">TOTAL</th></tr></thead>
            <tbody>
              {data.rekap.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.namaMenu}</td>
                  <td className="text-right">{item.qtyTotal}</td>
                  <td className="text-right">{item.pendapatanTotal.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-total">
            <div className="print-total-row"><span>Total Qty:</span><span>{data.grandTotalQty} item</span></div>
            <div className="print-total-row"><span>Total Transaksi:</span><span>{data.jumlahTransaksi} transaksi</span></div>
            <div className="print-total-row grand"><span>GRAND TOTAL:</span><span>Rp {data.grandTotalPendapatan.toLocaleString('id-ID')}</span></div>
          </div>
          <div className="print-divider" />
          <div className="print-footer">
            <p>*** REKAPITULASI PENJUALAN RESMI ***</p>
            <p>Kasir Vian Jaya 08</p>
          </div>
        </div>
      )}

      <PrinterSetup open={showPrinterSetup} onClose={() => setShowPrinterSetup(false)} onConfigured={(config) => { setPrinterConfig(config); if (config) setPrinterWidth(config.width) }} />
    </div>
  )
}
