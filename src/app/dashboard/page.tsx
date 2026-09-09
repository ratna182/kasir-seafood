import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Ambil status kasir hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const kasirSesi = await prisma.kasirSesi.findUnique({
    where: {
      warungId_tanggal: {
        warungId: session.warungId,
        tanggal: today,
      },
    },
  })

  const jumlahTransaksiHariIni = await prisma.transaksi.count({
    where: {
      warungId: session.warungId,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
  })

  const totalPendapatanHariIni = await prisma.transaksi.aggregate({
    where: {
      warungId: session.warungId,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
    _sum: { total: true },
  })

  const sudahTutup = !!kasirSesi
  const totalPendapatan = totalPendapatanHariIni._sum.total || 0

  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="app-container">
      <Navbar session={session} activePage="dashboard" />

      <div className="content-area">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            Dashboard Kasir 🍽️
          </h1>
          <p className="text-secondary text-sm">{dateStr}</p>
        </div>

        {/* Status Kasir Alert */}
        {sudahTutup ? (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            <span>🔒</span>
            <div>
              <strong>Kasir Sudah Ditutup</strong>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                Ditutup pada {new Date(kasirSesi!.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. 
                Transaksi baru dapat dibuat mulai besok.
              </p>
            </div>
          </div>
        ) : (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <span>✅</span>
            <div>
              <strong>Kasir Buka</strong>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Siap menerima pesanan.</p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧾</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: "'Outfit', sans-serif" }}>
              {jumlahTransaksiHariIni}
            </div>
            <div className="text-sm text-muted">Transaksi Hari Ini</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "'Outfit', sans-serif" }}>
              Rp {totalPendapatan.toLocaleString('id-ID')}
            </div>
            <div className="text-sm text-muted">Pendapatan Hari Ini</div>
          </div>
        </div>

        {/* Menu Navigasi */}
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Menu Utama
        </h2>
        <div className="dashboard-grid">
          <Link
            href="/transaksi"
            id="btn-transaksi-baru"
            className="stat-card"
            style={{
              pointerEvents: sudahTutup ? 'none' : 'auto',
              opacity: sudahTutup ? 0.5 : 1,
            }}
          >
            <div className="stat-card-icon" style={{ background: 'var(--color-primary-light)' }}>
              ➕
            </div>
            <div className="stat-card-info">
              <h3>Transaksi Baru</h3>
              <p>{sudahTutup ? 'Kasir sudah ditutup' : 'Catat pesanan tamu'}</p>
            </div>
          </Link>

          <Link href="/laporan" id="btn-laporan" className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
              📊
            </div>
            <div className="stat-card-info">
              <h3>Laporan Harian</h3>
              <p>Rekap penjualan & tutup kasir</p>
            </div>
          </Link>

          <Link href="/menu" id="btn-kelola-menu" className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(6, 182, 212, 0.12)' }}>
              🍽️
            </div>
            <div className="stat-card-info">
              <h3>Kelola Menu</h3>
              <p>Tambah, edit, atur menu</p>
            </div>
          </Link>

          <Link href="/riwayat" id="btn-riwayat" className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
              📋
            </div>
            <div className="stat-card-info">
              <h3>Riwayat Transaksi</h3>
              <p>Daftar transaksi hari ini</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
