import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncWarungMenus } from '@/lib/menu-sync'
import Navbar from '@/components/Navbar'
import TransaksiClient from './TransaksiClient'

export const metadata = {
  title: 'Buat Transaksi — Kasir Vian Jaya 08',
  description: 'Catat pesanan tamu, hitung total, dan cetak struk thermal 80mm.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // Self-heal menu kasir tanpa menghapus menu yang sudah dipakai transaksi.
  await syncWarungMenus(session.warungId)

  // Cek apakah kasir sudah tutup hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [kasirSesi, menus, activeOrders] = await Promise.all([
    prisma.kasirSesi.findUnique({
      where: { warungId_tanggal: { warungId: session.warungId, tanggal: today } },
    }),
    prisma.menu.findMany({
      where: { warungId: session.warungId, isAktif: true },
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    }),
    prisma.transaksi.findMany({
      where: { warungId: session.warungId, status: 'OPEN' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const serializedMenus = menus.map((m) => ({
    id: m.id,
    nama: m.nama,
    kategori: m.kategori,
    harga: m.harga,
    isAktif: m.isAktif,
  }))

  const serializedActiveOrders = activeOrders.map((order) => ({
    id: order.id,
    nomorMeja: order.nomorMeja,
    total: order.total,
    metodePembayaran: order.metodePembayaran,
    tanggal: order.tanggal.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    minutesOpen: 0,
    items: order.items.map((item) => ({
      id: item.id,
      namaMenu: item.namaMenu,
      hargaSatuan: item.hargaSatuan,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
  }))

  return (
    <div className="app-container">
      <Navbar session={session} activePage="transaksi" />
      <div className="content-area">
        <TransaksiClient
          session={session}
          menus={serializedMenus}
          initialActiveOrders={serializedActiveOrders}
          isKasirClosed={!!kasirSesi}
        />
      </div>
    </div>
  )
}
