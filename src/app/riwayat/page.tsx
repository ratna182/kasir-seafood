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

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ mulai?: string; sampai?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { mulai, sampai } = await searchParams
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(mulai || '') ? new Date(`${mulai}T00:00:00.000Z`) : undefined
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(sampai || '') ? new Date(`${sampai}T00:00:00.000Z`) : undefined

  const transaksis = await prisma.transaksi.findMany({
    where: {
      warungId: session.warungId ?? undefined,
      ...(startDate || endDate ? { tanggal: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
      status: 'SELESAI',
    },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = transaksis.map((transaksi) => ({
    id: transaksi.id,
    nomorMeja: transaksi.nomorMeja,
    total: transaksi.total,
    metodePembayaran: transaksi.metodePembayaran,
    tanggal: transaksi.tanggal.toISOString(),
    createdAt: transaksi.createdAt.toISOString(),
    items: transaksi.items.map((item) => ({
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
      <Navbar session={session} activePage="riwayat" />
      <div className="content-area">
        <RiwayatClient session={session} initialTransaksis={serialized} initialStartDate={mulai} initialEndDate={sampai} />
      </div>
    </div>
  )
}
