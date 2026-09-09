import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import LaporanClient from './LaporanClient'

export const metadata = {
  title: 'Laporan Harian & Tutup Kasir — Kasir Vian Jaya 08',
  description: 'Rekapitulasi penjualan harian dan penutupan shift kasir.',
}

export default async function LaporanPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  // Hanya owner yang boleh akses halaman ini
  if (session.role !== 'OWNER') {
    redirect('/transaksi')
  }
  
  if (!session.warungId) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const kasirSesiRaw = await prisma.$queryRawUnsafe<
    Array<{
      ditutup_pada: Date
      total_transaksi: number
      total_pendapatan: number
      nama_lengkap: string | null
      username: string
    }>
  >(
    `SELECT ks.ditutup_pada, ks.total_transaksi, ks.total_pendapatan,
            u.nama_lengkap, u.username
     FROM kasir_sesis ks
     JOIN users u ON u.id = ks.ditutup_oleh
     WHERE ks.warung_id = $1 AND ks.tanggal = $2
     LIMIT 1`,
    session.warungId,
    today
  )

  const kasirSesi = kasirSesiRaw[0] ?? null

  return (
    <div className="app-container">
      <Navbar session={session} activePage="laporan" />
      <div className="content-area">
        <LaporanClient
          session={session}
          initialKasirSesi={
            kasirSesi
              ? {
                  ditutupPada: kasirSesi.ditutup_pada.toISOString(),
                  ditutupOleh:
                    kasirSesi.nama_lengkap || kasirSesi.username,
                  totalTransaksi: kasirSesi.total_transaksi,
                  totalPendapatan: kasirSesi.total_pendapatan,
                }
              : null
          }
        />
      </div>
    </div>
  )
}
