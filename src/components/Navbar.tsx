'use client'

import Link from 'next/link'
import LogoutButton from './LogoutButton'

interface NavbarProps {
  session: {
    warungNama: string | null
    warungKode: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  activePage?: 'dashboard' | 'transaksi' | 'menu' | 'laporan' | 'riwayat' | 'kasir'
}

export default function Navbar({ session, activePage }: NavbarProps) {
  const shortWarungName = session.warungNama?.split(' - ')[0] ?? 'Tanpa Nama'

  return (
    <nav className="navbar no-print">
      <div className="navbar-brand">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
          <div className="navbar-logo">VJ</div>
          <div>
            <div className="navbar-title">{shortWarungName}</div>
            <div className="navbar-subtitle">Kode Cabang: {session.warungKode}</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* Owner only links */}
          {session.role === 'OWNER' && (
            <>
              <Link
                href="/dashboard"
                className={`btn btn-sm ${activePage === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                🏠 Dashboard
              </Link>
              <Link
                href="/laporan"
                className={`btn btn-sm ${activePage === 'laporan' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                📊 Laporan
              </Link>
              <Link
                href="/menu"
                className={`btn btn-sm ${activePage === 'menu' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                🍽️ Menu
              </Link>
              <Link
                href="/kasir"
                className={`btn btn-sm ${activePage === 'kasir' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                👥 Kasir
              </Link>
            </>
          )}
          
          {/* Kasir only links */}
          {session.role === 'KASIR' && (
            <>
              <Link
                href="/transaksi"
                className={`btn btn-sm ${activePage === 'transaksi' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                ➕ Transaksi
              </Link>
              <Link
                href="/riwayat"
                className={`btn btn-sm ${activePage === 'riwayat' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                📋 Riwayat
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions" style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="navbar-user text-sm text-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>👤</span>
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.namaLengkap || session.username}
            </span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}
