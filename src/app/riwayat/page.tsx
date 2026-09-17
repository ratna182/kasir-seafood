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

  const serializedSesis = await Promise.all(kasirSesis.map(async (s) => {
    const sessionStart = s.dibukaKembaliPada ?? s.tanggal
    const sessionEnd = s.ditutupPada

    const transaksisSesi = await prisma.transaksi.findMany({
      where: {
        warungId: session.warungId ?? undefined,
        createdAt: { gte: sessionStart, lte: sessionEnd },
        status: 'SELESAI',
      },
      include: { items: true },
    })

    const uniqueMenuIds = [...new Set(transaksisSesi.flatMap(t => t.items.map(i => i.menuId)))]
    const menuCategories = await prisma.menu.findMany({
      where: { id: { in: uniqueMenuIds }, warungId: session.warungId ?? undefined },
      select: { id: true, category: { select: { nama: true } } },
    })
    const kategoriMap = new Map(menuCategories.map(m => [m.id, m.category?.nama || 'Lainnya']))

    const rekapMap = new Map<string, { namaMenu: string; kategori: string; qtyTotal: number; pendapatanTotal: number }>()
    let grandTotalQty = 0
    let totalCash = 0
    let totalQRIS = 0
    let totalTransfer = 0

    for (const tx of transaksisSesi) {
      if (tx.metodePembayaran === 'QRIS') totalQRIS += tx.total
      else if (tx.metodePembayaran === 'TRANSFER') totalTransfer += tx.total
      else totalCash += tx.total

      for (const item of tx.items) {
        grandTotalQty += item.qty
        const existing = rekapMap.get(item.namaMenu)
        if (existing) {
          existing.qtyTotal += item.qty
          existing.pendapatanTotal += item.subtotal
        } else {
          rekapMap.set(item.namaMenu, {
            namaMenu: item.namaMenu,
            kategori: kategoriMap.get(item.menuId) || 'MAKANAN',
            qtyTotal: item.qty,
            pendapatanTotal: item.subtotal,
          })
        }
      }
    }

    const rekap = Array.from(rekapMap.values()).sort((a, b) => {
      if (a.kategori !== b.kategori) return a.kategori === 'MAKANAN' ? -1 : 1
      return a.namaMenu.localeCompare(b.namaMenu)
    })

    return {
      id: s.id,
      tanggal: s.tanggal.toISOString().split('T')[0],
      ditutupPada: s.ditutupPada.toISOString(),
      dibukaKembaliPada: s.dibukaKembaliPada?.toISOString() ?? null,
      ditutupOleh: s.user.namaLengkap || s.user.username,
      totalTransaksi: s.totalTransaksi,
      totalPendapatan: s.totalPendapatan,
      warungNama: s.warung.nama,
      warungKode: s.warung.kode,
      detail: {
        rekap,
        transaksi: transaksisSesi.map(t => ({
          nomorMeja: t.nomorMeja,
          total: t.total,
          metodePembayaran: t.metodePembayaran || 'CASH',
          createdAt: t.createdAt.toISOString(),
        })),
        grandTotalQty,
        totalCash,
        totalQRIS,
        totalTransfer,
        jumlahTransaksi: transaksisSesi.length,
      },
    }
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
