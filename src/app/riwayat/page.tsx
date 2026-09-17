import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import RiwayatClient from './RiwayatClient'

export const metadata = {
  title: 'Riwayat Laporan Harian — Kasir Vian Jaya 08',
  description: 'Riwayat sesi kasir (buka/tutup) dan laporan keuangan harian.',
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

  const kasirSesis = await prisma.kasirSesi.findMany({
    where: {
      warungId: session.warungId ?? undefined,
      ...(tanggalFilter ? { tanggal: tanggalFilter } : {}),
    },
    include: {
      user: { select: { namaLengkap: true, username: true } },
      warung: { select: { nama: true, kode: true, alamat: true } },
    },
    orderBy: [{ tanggal: 'desc' }, { ditutupPada: 'desc' }],
  })

  const serializedSesis = await Promise.all(kasirSesis.map(async (s) => {
    // Find previous session for the same warung+day to determine effective start
    // (same logic as getKasirSessionState in laporan page)
    const previousSession = await prisma.kasirSesi.findFirst({
      where: {
        warungId: s.warungId,
        tanggal: s.tanggal,
        ditutupPada: { lt: s.ditutupPada },
      },
      orderBy: { ditutupPada: 'desc' },
    })

    // Effective start = previous session's dibukaKembaliPada, or this session's
    // dibukaKembaliPada (if it marks when this session opened), or tanggal
    const effectiveStart = previousSession?.dibukaKembaliPada ?? s.dibukaKembaliPada ?? s.tanggal

    // End of this session's day (same as laporan: lt tomorrow)
    const tomorrow = new Date(s.tanggal)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const transaksisSesi = await prisma.transaksi.findMany({
      where: {
        warungId: s.warungId,
        createdAt: { gte: effectiveStart, lt: tomorrow },
        status: 'SELESAI',
      },
      include: { items: true },
    })

    const uniqueMenuIds = [...new Set(transaksisSesi.flatMap(t => t.items.map(i => i.menuId)))]
    const menuCategories = await prisma.menu.findMany({
      where: { id: { in: uniqueMenuIds }, warungId: s.warungId },
      select: { id: true, category: { select: { nama: true } } },
    })
    const kategoriMap = new Map(menuCategories.map(m => [m.id, m.category?.nama || 'Lainnya']))

    const rekapMap = new Map<string, { namaMenu: string; kategori: string; qtyTotal: number; pendapatanTotal: number }>()
    let grandTotalQty = 0
    let grandTotalPendapatan = 0
    let totalCash = 0
    let totalQRIS = 0
    let totalTransfer = 0

    for (const tx of transaksisSesi) {
      grandTotalPendapatan += tx.total
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

    // Use stored totals if recalculated is 0 (e.g. first buka session with no transactions yet)
    const finalTotalPendapatan = grandTotalPendapatan > 0 ? grandTotalPendapatan : s.totalPendapatan
    const finalTotalTransaksi = transaksisSesi.length > 0 ? transaksisSesi.length : s.totalTransaksi

    return {
      id: s.id,
      tanggal: s.tanggal.toISOString().split('T')[0],
      ditutupPada: s.ditutupPada.toISOString(),
      dibukaKembaliPada: s.dibukaKembaliPada?.toISOString() ?? null,
      ditutupOleh: s.user.namaLengkap || s.user.username,
      totalTransaksi: finalTotalTransaksi,
      totalPendapatan: finalTotalPendapatan,
      warungNama: s.warung.nama,
      warungKode: s.warung.kode,
      warungAlamat: s.warung.alamat,
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

  return (
    <div className="app-container">
      <Navbar session={session} activePage="riwayat" />
      <div className="content-area">
        <RiwayatClient session={session} initialKasirSesis={serializedSesis} initialStartDate={mulai} initialEndDate={sampai} />
      </div>
    </div>
  )
}
