import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import RiwayatClient from './RiwayatClient'

export const metadata = {
  title: 'Riwayat Transaksi — Kasir Vian Jaya 08',
  description: 'Daftar transaksi hari ini dan cetak ulang struk.',
}

export default async function RiwayatPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const transaksis = await prisma.transaksi.findMany({
    where: {
      warungId: session.warungId,
      tanggal: { gte: today, lt: tomorrow },
      status: 'SELESAI',
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = transaksis.map((t) => ({
    id: t.id,
    nomorMeja: t.nomorMeja,
    total: t.total,
    tanggal: t.tanggal.toISOString(),
    createdAt: t.createdAt.toISOString(),
    items: t.items.map((i) => ({
      id: i.id,
      namaMenu: i.namaMenu,
      hargaSatuan: i.hargaSatuan,
      qty: i.qty,
      subtotal: i.subtotal,
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
