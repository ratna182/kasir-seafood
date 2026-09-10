import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

// POST /api/menu/sync — sync menu dari warung pertama ke semua warung lain (owner only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const warungs = await prisma.warung.findMany({ orderBy: { kode: 'asc' } })
    if (warungs.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada warung.' }, { status: 404 })
    }

    const sourceWarung = warungs[0]
    const sourceMenus = await prisma.menu.findMany({
      where: { warungId: sourceWarung.id },
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    })

    if (sourceMenus.length === 0) {
      return NextResponse.json({ success: false, message: `Tidak ada menu di warung ${sourceWarung.nama}. Buat menu dulu.` }, { status: 404 })
    }

    let synced = 0
    for (const warung of warungs) {
      if (warung.id === sourceWarung.id) continue

      await prisma.menu.deleteMany({ where: { warungId: warung.id } })
      await prisma.menu.createMany({
        data: sourceMenus.map((m) => ({
          warungId: warung.id,
          nama: m.nama,
          kategori: m.kategori,
          harga: m.harga,
          isAktif: m.isAktif,
        })),
      })
      synced++
    }

    return NextResponse.json({
      success: true,
      message: `${sourceMenus.length} menu disalin ke ${synced} warung.`,
      data: { source: sourceWarung.nama, syncedWarungs: synced, menuCount: sourceMenus.length },
    })
  } catch (error) {
    console.error('[POST /api/menu/sync]', error)
    return NextResponse.json({ success: false, message: 'Gagal sync menu.' }, { status: 500 })
  }
}
