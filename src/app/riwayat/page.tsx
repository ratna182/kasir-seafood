import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import RiwayatClient from './RiwayatClient'

export const metadata = {
  title: 'Riwayat Keuangan — Kasir Vian Jaya 08',
  description: 'Riwayat sesi kasir (buka/tutup) dan transaksi harian.',
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

  const tanggalFilter = startDate || endDate ? { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } : undefined

  const [transaksis, kasirSesis] = await Promise.all([
    prisma.transaksi.findMany({
      where: {
        warungId: session.warungId ?? undefined,
        ...(tanggalFilter ? { tanggal: tanggalFilter } : {}),
        status: 'SELESAI',
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.kasirSesi.findMany({
      where: {
        warungId: session.warungId ?? undefined,
        ...(tanggalFilter ? { tanggal: tanggalFilter } : {}),
      },
      include: {
        user: { select: { namaLengkap: true, username: true } },
        warung: { select: { nama: true, kode: true } },
      },
      orderBy: [{ tanggal: 'desc' }, { ditutupPada: 'desc' }],
    }),
  ])

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

  const serializedSesis = kasirSesis.map((s) => ({
    id: s.id,
    tanggal: s.tanggal.toISOString().split('T')[0],
    ditutupPada: s.ditutupPada.toISOString(),
    dibukaKembaliPada: s.dibukaKembaliPada?.toISOString() ?? null,
    ditutupOleh: s.user.namaLengkap || s.user.username,
    totalTransaksi: s.totalTransaksi,
    totalPendapatan: s.totalPendapatan,
    warungNama: s.warung.nama,
    warungKode: s.warung.kode,
  }))

  const warung = session.warungId ? await prisma.warung.findUnique({ where: { id: session.warungId }, select: { alamat: true } }) : null

  return (
    <div className="app-container">
      <Navbar session={session} activePage="riwayat" />
      <div className="content-area">
        <RiwayatClient session={session} warungAlamat={warung?.alamat ?? null} initialTransaksis={serialized} initialKasirSesis={serializedSesis} initialStartDate={mulai} initialEndDate={sampai} />
      </div>
    </div>
  )
}
