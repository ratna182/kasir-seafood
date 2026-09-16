import { prisma } from '@/lib/prisma'
import { getKasirSessionState } from '@/lib/kasir-session'
import { getSession } from '@/lib/session'
import Navbar from '@/components/Navbar'
import LaporanClient from './LaporanClient'

export const metadata = {
  title: 'Laporan Harian & Tutup Kasir — Kasir Vian Jaya 08',
  description: 'Rekapitulasi penjualan harian dan penutupan shift kasir.',
}

interface WarungOption { id: string; nama: string; kode: string }

export default async function LaporanPage() {
  const [warungs, defaultWarung] = await Promise.all([
    prisma.warung.findMany({ orderBy: { nama: 'asc' }, select: { id: true, nama: true, kode: true } }),
    prisma.warung.findFirst({ orderBy: { nama: 'asc' }, select: { id: true, nama: true, kode: true } }),
  ])

  if (!defaultWarung) {
    return (
      <div className="app-container">
        <div className="content-area" style={{ padding: '3rem', textAlign: 'center' }}>
          <p>Warung tidak ditemukan.</p>
        </div>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Ambil status kasir hari ini
  const state = await getKasirSessionState(prisma, defaultWarung.id)
  let sessionStart = state.sessionStart

  if (state.isClosed && state.latest) {
    const previousSession = await prisma.kasirSesi.findFirst({
      where: {
        warungId: defaultWarung.id,
        tanggal: state.today,
        ditutupPada: { lt: state.latest.ditutupPada },
      },
      orderBy: { ditutupPada: 'desc' },
    })
    sessionStart = previousSession?.dibukaKembaliPada ?? state.today
  }

  // Ambil data laporan
  const transaksis = await prisma.transaksi.findMany({
    where: {
      warungId: defaultWarung.id,
      createdAt: { gte: sessionStart, lt: state.tomorrow },
      status: 'SELESAI',
    },
    include: { items: true },
  })

  const aktivitasKasir = await prisma.activityLog.findMany({
    where: {
      warungId: defaultWarung.id,
      createdAt: { gte: state.today, lt: state.tomorrow },
      aktivitas: { in: ['LOGIN', 'BUKA_KASIR', 'TUTUP_KASIR'] },
    },
    include: { user: { select: { namaLengkap: true, username: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const uniqueMenuIds = [...new Set(transaksis.flatMap(t => t.items.map(i => i.menuId)))]
  const menuCategories = await prisma.menu.findMany({
    where: { id: { in: uniqueMenuIds }, warungId: defaultWarung.id },
    select: { id: true, category: { select: { nama: true } } },
  })
  const kategoriMap = new Map(menuCategories.map(m => [m.id, m.category?.nama || 'Lainnya']))

  const rekapMap = new Map<string, { namaMenu: string; kategori: string; qtyTotal: number; pendapatanTotal: number }>()
  let grandTotalQty = 0
  let grandTotalPendapatan = 0
  let totalCash = 0
  let totalQRIS = 0
  let totalTransfer = 0

  for (const transaksi of transaksis) {
    grandTotalPendapatan += transaksi.total
    if (transaksi.metodePembayaran === 'QRIS') totalQRIS += transaksi.total
    else if (transaksi.metodePembayaran === 'TRANSFER') totalTransfer += transaksi.total
    else totalCash += transaksi.total
    for (const item of transaksi.items) {
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

  const laporanData = {
    tanggal: state.today.toISOString().split('T')[0],
    warung: { id: defaultWarung.id, nama: defaultWarung.nama, kode: defaultWarung.kode, alamat: null },
    rekap,
    transaksi: transaksis.map(t => ({
      nomorMeja: t.nomorMeja,
      total: t.total,
      metodePembayaran: t.metodePembayaran || 'CASH',
      createdAt: t.createdAt.toISOString(),
    })),
    grandTotalQty,
    grandTotalPendapatan,
    jumlahTransaksi: transaksis.length,
    totalCash,
    totalQRIS,
    totalTransfer,
    aktivitasKasir: aktivitasKasir.map((a) => ({
      waktu: a.createdAt.toISOString(),
      kasir: a.user.namaLengkap || a.user.username,
      aktivitas: a.aktivitas,
      detail: a.detail,
    })),
  }

  const kasirSesi = state.isClosed && state.latest
    ? {
        ditutupPada: state.latest.ditutupPada.toISOString(),
        ditutupOleh: 'Kasir',
        totalTransaksi: state.latest.totalTransaksi,
        totalPendapatan: state.latest.totalPendapatan,
      }
    : null

  // Deteksi role dari session cookie — owner tetap dapat navbar lengkap
  const session = await getSession()
  const role = session?.role === 'OWNER' ? 'OWNER' : 'KASIR'

  return (
    <div className="app-container">
      <Navbar
        session={{
          warungNama: defaultWarung.nama,
          warungKode: defaultWarung.kode,
          namaLengkap: session?.namaLengkap ?? defaultWarung.nama,
          username: session?.username ?? defaultWarung.kode,
          role,
        }}
        activePage="laporan"
      />
      <div className="content-area">
        <LaporanClient
          warungId={defaultWarung.id}
          warungNama={defaultWarung.nama}
          warungKode={defaultWarung.kode}
          warungs={warungs}
          role={role}
          initialData={laporanData}
          initialKasirSesi={kasirSesi}
        />
      </div>
    </div>
  )
}
