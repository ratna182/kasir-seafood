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

  const kasirSesi = await prisma.kasirSesi.findUnique({
    where: {
      warungId_tanggal: {
        warungId: session.warungId,
        tanggal: today,
      },
    },
    include: {
      user: {
        select: { namaLengkap: true, username: true },
      },
    },
  })

  return (
    <div className="app-container">
      <Navbar session={session} activePage="laporan" />
      <div className="content-area">
        <LaporanClient
          session={session}
          initialKasirSesi={
            kasirSesi
              ? {
                  ditutupPada: kasirSesi.ditutupPada.toISOString(),
                  ditutupOleh:
                    kasirSesi.user.namaLengkap || kasirSesi.user.username,
                  totalTransaksi: kasirSesi.totalTransaksi,
                  totalPendapatan: kasirSesi.totalPendapatan,
                }
              : null
          }
        />
      </div>
    </div>
  )
}
