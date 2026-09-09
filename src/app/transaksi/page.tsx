import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import TransaksiClient from './TransaksiClient'

export const metadata = {
  title: 'Buat Transaksi — Kasir Vian Jaya 08',
  description: 'Catat pesanan tamu, hitung total, dan cetak struk thermal 80mm.',
}

export default async function TransaksiPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  // Hanya kasir yang boleh akses halaman ini
  if (session.role !== 'KASIR') {
    redirect('/dashboard')
  }
  
  if (!session.warungId) {
    redirect('/login')
  }

  // Cek apakah kasir sudah tutup hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const kasirSesi = await prisma.kasirSesi.findUnique({
    where: {
      warungId_tanggal: {
        warungId: session.warungId,
        tanggal: today,
      },
    },
  })

  // Ambil menu aktif untuk warung ini
  const menus = await prisma.menu.findMany({
    where: {
      warungId: session.warungId,
      isAktif: true,
    },
    orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
  })

  const serializedMenus = menus.map((m) => ({
    id: m.id,
    nama: m.nama,
    kategori: m.kategori,
    harga: m.harga,
    isAktif: m.isAktif,
  }))

  return (
    <div className="app-container">
      <Navbar session={session} activePage="transaksi" />
      <div className="content-area">
        <TransaksiClient
          session={session}
          menus={serializedMenus}
          isKasirClosed={!!kasirSesi}
        />
      </div>
    </div>
  )
}
