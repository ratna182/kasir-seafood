import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isOwner, requireWarungAccess } from '@/lib/auth'

// GET /api/laporan/harian — rekap penjualan hari ini per menu
// Query params: warung_id (required untuk owner, optional untuk kasir)
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    if (!context) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const warungIdParam = searchParams.get('warung_id')

    // Tentukan warung_id berdasarkan role
    let warungId: string
    if (isOwner(context)) {
      // Owner harus specify warung_id
      if (!warungIdParam) {
        return NextResponse.json({ success: false, message: 'warung_id wajib diisi untuk owner.' }, { status: 400 })
      }
      // Validasi akses warung
      const warungAccessError = requireWarungAccess(context, warungIdParam)
      if (warungAccessError) return warungAccessError
      warungId = warungIdParam
    } else {
      // Kasir hanya bisa lihat warungnya sendiri
      warungId = context.warungId ?? ''
      if (!warungId) {
        return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Ambil semua transaksi SELESAI hari ini
    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        tanggal: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
      include: {
        items: true,
      },
    })

    // Ambil info warung
    const warung = await prisma.warung.findUnique({
      where: { id: warungId },
      select: { id: true, nama: true, kode: true },
    })

    // Rekap per menu - batch fetch semua kategori sekaligus (anti N+1)
    const uniqueMenuIds = [...new Set(transaksis.flatMap(t => t.items.map(i => i.menuId)))]

    const menuCategories = await prisma.menu.findMany({
      where: { id: { in: uniqueMenuIds }, warungId },
      select: { id: true, category: { select: { nama: true } } },
    })
    const kategoriMap = new Map(menuCategories.map(m => [m.id, m.category?.nama || 'Lainnya']))

    const rekapMap = new Map<string, {
      namaMenu: string
      kategori: string
      qtyTotal: number
      pendapatanTotal: number
    }>()

    let grandTotalQty = 0
    let grandTotalPendapatan = 0
    let totalCash = 0
    let totalQRIS = 0
    let totalTransfer = 0

    for (const transaksi of transaksis) {
      grandTotalPendapatan += transaksi.total
      if (transaksi.metodePembayaran === 'QRIS') {
        totalQRIS += transaksi.total
      } else if (transaksi.metodePembayaran === 'TRANSFER') {
        totalTransfer += transaksi.total
      } else {
        totalCash += transaksi.total
      }
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

    // Urutkan: Makanan dulu, lalu Minuman; dalam kategori alphabetically
    const rekap = Array.from(rekapMap.values()).sort((a, b) => {
      if (a.kategori !== b.kategori) {
        return a.kategori === 'MAKANAN' ? -1 : 1
      }
      return a.namaMenu.localeCompare(b.namaMenu)
    })

    return NextResponse.json({
      success: true,
      data: {
        tanggal: today.toISOString().split('T')[0],
        warung,
        rekap,
        grandTotalQty,
        grandTotalPendapatan,
        jumlahTransaksi: transaksis.length,
        totalCash,
        totalQRIS,
        totalTransfer,
      },
    })
  } catch (error) {
    console.error('[GET /api/laporan/harian]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil laporan.' }, { status: 500 })
  }
}
