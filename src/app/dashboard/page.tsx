import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Dashboard untuk OWNER
  if (session.role === 'OWNER') {
    // Total penjualan hari ini (semua warung)
    const totalPenjualan = await prisma.transaksi.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
      _sum: { total: true },
    })

    // Total transaksi hari ini
    const totalTransaksi = await prisma.transaksi.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
    })

    // Jumlah kasir aktif
    const jumlahKasir = await prisma.user.count({
      where: { role: 'KASIR', isActive: true },
    })

    // Jumlah warung
    const jumlahWarung = await prisma.warung.count()

    // Penjualan per warung
    const penjualanPerWarung = await prisma.transaksi.groupBy({
      by: ['warungId'],
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
      _sum: { total: true },
      _count: { id: true },
    })

    const warungIds = penjualanPerWarung.map((w) => w.warungId)
    const warungs = await prisma.warung.findMany({
      where: { id: { in: warungIds } },
    })
    const warungMap = new Map(warungs.map((w) => [w.id, w.nama]))

    const penjualanWarung = penjualanPerWarung.map((item) => ({
      warungNama: warungMap.get(item.warungId) || 'Unknown',
      totalBayar: item._sum?.total || 0,
      jumlahTransaksi: item._count?.id || 0,
    }))

    // Top menu hari ini
    const topMenu = await prisma.transaksiItem.groupBy({
      by: ['menuId'],
      where: {
        transaksi: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'SELESAI',
        },
      },
      _sum: { subtotal: true, qty: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 5,
    })

    const menuIds = topMenu.map((m) => m.menuId)
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
    })
    const menuMap = new Map(menus.map((m) => [m.id, m.nama]))

    const topMenuWithNames = topMenu.map((item) => ({
      menuNama: menuMap.get(item.menuId) || 'Unknown',
      totalPenjualan: item._sum?.subtotal || 0,
      totalQty: item._sum?.qty || 0,
    }))

    return (
      <div className="app-container">
        <Navbar session={session} activePage="dashboard" />
        <div className="content-area">
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Dashboard Owner 📊</h1>
            <p className="text-secondary text-sm">{dateStr}</p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: "'Outfit', sans-serif" }}>
                Rp {(totalPenjualan._sum?.total || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-muted">Total Penjualan Hari Ini</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧾</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "'Outfit', sans-serif" }}>
                {totalTransaksi}
              </div>
              <div className="text-sm text-muted">Total Transaksi</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-info)', fontFamily: "'Outfit', sans-serif" }}>
                {jumlahKasir}
              </div>
              <div className="text-sm text-muted">Kasir Aktif</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)', fontFamily: "'Outfit', sans-serif" }}>
                {jumlahWarung}
              </div>
              <div className="text-sm text-muted">Total Warung</div>
            </div>
          </div>

          {/* Penjualan Per Warung */}
          {penjualanWarung.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Penjualan Per Warung Hari Ini
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {penjualanWarung.map((item, index) => (
                  <div key={index} className="card">
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{item.warungNama}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Rp {item.totalBayar.toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-muted">{item.jumlahTransaksi} transaksi</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Menu */}
          {topMenuWithNames.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Menu Terlaris Hari Ini
              </h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Menu</th>
                      <th>Terjual</th>
                      <th>Total Penjualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMenuWithNames.map((item, index) => (
                      <tr key={index}>
                        <td>#{index + 1}</td>
                        <td><strong>{item.menuNama}</strong></td>
                        <td>{item.totalQty} porsi</td>
                        <td>Rp {item.totalPenjualan.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
            Akses Cepat
          </h2>
          <div className="dashboard-grid">
            <Link href="/laporan" className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>📊</div>
              <div className="stat-card-info">
                <h3>Laporan</h3>
                <p>Rekap penjualan & export</p>
              </div>
            </Link>
            <Link href="/menu" className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(6, 182, 212, 0.12)' }}>🍽️</div>
              <div className="stat-card-info">
                <h3>Kelola Menu</h3>
                <p>Tambah, edit, atur menu</p>
              </div>
            </Link>
            <Link href="/kasir" className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>👥</div>
              <div className="stat-card-info">
                <h3>Manajemen Kasir</h3>
                <p>Kelola akun kasir</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard untuk KASIR
  const kasirSesi = await prisma.kasirSesi.findUnique({
    where: {
      warungId_tanggal: {
        warungId: session.warungId!,
        tanggal: today,
      },
    },
  })

  const jumlahTransaksiHariIni = await prisma.transaksi.count({
    where: {
      warungId: session.warungId!,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
  })

  const totalPendapatanHariIni = await prisma.transaksi.aggregate({
    where: {
      warungId: session.warungId!,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
    _sum: { total: true },
  })

  const sudahTutup = !!kasirSesi
  const totalPendapatan = totalPendapatanHariIni._sum.total || 0

  return (
    <div className="app-container">
      <Navbar session={session} activePage="dashboard" />
      <div className="content-area">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Dashboard Kasir 🍽️</h1>
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
            <div className="stat-card-icon" style={{ background: 'var(--color-primary-light)' }}>➕</div>
            <div className="stat-card-info">
              <h3>Transaksi Baru</h3>
              <p>{sudahTutup ? 'Kasir sudah ditutup' : 'Catat pesanan tamu'}</p>
            </div>
          </Link>
          <Link href="/riwayat" id="btn-riwayat" className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>📋</div>
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
