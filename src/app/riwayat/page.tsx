import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import RiwayatClient from './RiwayatClient'

export const metadata = {
  title: 'Riwayat Transaksi — Kasir Vian Jaya 08',
  description: 'Daftar transaksi hari ini dan cetak ulang struk.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RiwayatPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const transaksis = await prisma.transaksi.findMany({
    where: {
      warungId: session.warungId ?? undefined,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serialized = transaksis.map((transaksi) => ({
    id: transaksi.id,
    nomorMeja: transaksi.nomorMeja,
    total: transaksi.total,
    tanggal: transaksi.tanggal.toISOString(),
    createdAt: transaksi.createdAt.toISOString(),
    items: transaksi.items.map((item) => ({
      id: item.id,
      namaMenu: item.namaMenu,
      hargaSatuan: item.hargaSatuan,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
  }))

  return (
    <div className="app-container">
      <Navbar session={session} activePage="riwayat" />
      <div className="content-area">
        <RiwayatClient session={session} initialTransaksis={serialized} />
      </div>
    </div>
  )
}
