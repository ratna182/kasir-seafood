import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
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
  
  const ownerWarung = session.role === 'OWNER'
    ? await prisma.warung.findUnique({ where: { kode: 'VJ08-1' }, select: { id: true, nama: true, kode: true } })
    : null
  const activeSession = ownerWarung
    ? { ...session, warungId: ownerWarung.id, warungNama: ownerWarung.nama, warungKode: ownerWarung.kode }
    : session

  if (!activeSession.warungId) redirect('/login')

  // Cek apakah kasir sudah tutup hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [kasirSesi, menus, activeOrders] = await Promise.all([
    prisma.kasirSesi.findUnique({
      where: { warungId_tanggal: { warungId: activeSession.warungId, tanggal: today } },
    }),
    prisma.menu.findMany({
      where: { warungId: activeSession.warungId, isAktif: true },
      include: { category: { select: { id: true, nama: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }],
    }),
    prisma.transaksi.findMany({
      where: { warungId: activeSession.warungId, status: 'OPEN' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const serializedMenus = menus.map((m) => ({
    id: m.id,
    nama: m.nama,
    harga: m.harga,
    isAktif: m.isAktif,
    categoryId: m.categoryId,
    category: m.category,
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
      diskonSatuan: item.diskonSatuan,
      catatan: item.catatan,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
  }))

  return (
    <div className="app-container">
      <Navbar session={session} activePage="transaksi" />
      <div className="content-area">
        <TransaksiClient
          session={activeSession}
          menus={serializedMenus}
          initialActiveOrders={serializedActiveOrders}
          isKasirClosed={!!kasirSesi}
        />
      </div>
    </div>
  )
}
