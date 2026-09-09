import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

// GET /api/dashboard — ambil data ringkasan dashboard
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya owner yang boleh akses dashboard
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. Total penjualan hari ini
    const totalPenjualan = await prisma.transaksi.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'SELESAI',
      },
      _sum: {
        total: true,
      },
    })

    // 2. Total transaksi hari ini
    const totalTransaksi = await prisma.transaksi.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'SELESAI',
      },
    })

    // 3. Jumlah kasir aktif
    const jumlahKasir = await prisma.user.count({
      where: {
        role: 'KASIR',
        isActive: true,
      },
    })

    // 4. Penjualan per warung hari ini
    const penjualanPerWarung = await prisma.transaksi.groupBy({
      by: ['warungId'],
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'SELESAI',
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    })

    // Ambil nama warung
    const warungIds = penjualanPerWarung.map((w) => w.warungId)
    const warungs = await prisma.warung.findMany({
      where: { id: { in: warungIds } },
    })
    const warungMap = new Map(warungs.map((w) => [w.id, w.nama]))

    const penjualanWarung = penjualanPerWarung.map((item) => ({
      warungId: item.warungId,
      warungNama: warungMap.get(item.warungId) || 'Unknown',
      totalBayar: item._sum?.total || 0,
      jumlahTransaksi: item._count?.id || 0,
    }))

    // 5. Menu terlaris hari ini
    const topMenu = await prisma.transaksiItem.groupBy({
      by: ['menuId'],
      where: {
        transaksi: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          status: 'SELESAI',
        },
      },
      _sum: {
        subtotal: true,
        qty: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: 5,
    })

    // Ambil nama menu
    const menuIds = topMenu.map((m) => m.menuId)
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
    })
    const menuMap = new Map(menus.map((m) => [m.id, m.nama]))

    const topMenuWithNames = topMenu.map((item) => ({
      menuId: item.menuId,
      menuNama: menuMap.get(item.menuId) || 'Unknown',
      totalPenjualan: item._sum?.subtotal || 0,
      totalQty: item._sum?.qty || 0,
    }))

    // 6. Transaksi terakhir (5 terbaru)
    const recentTransaksi = await prisma.transaksi.findMany({
      where: {
        status: 'SELESAI',
      },
      include: {
        warung: {
          select: { nama: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const recentData = recentTransaksi.map((t) => ({
      id: t.id,
      warungNama: t.warung?.nama || 'Unknown',
      totalBayar: t.total,
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalPenjualan: totalPenjualan._sum?.total || 0,
        totalTransaksi,
        jumlahKasir,
        penjualanWarung,
        topMenu: topMenuWithNames,
        recentTransaksi: recentData,
      },
    })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data dashboard.' }, { status: 500 })
  }
}
