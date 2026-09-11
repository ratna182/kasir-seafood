import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isOwner, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const warungId = searchParams.get('warung_id')

    const where: { warungId?: string } = {}
    if (warungId) where.warungId = warungId

    const warungMenus = await prisma.warungMenu.findMany({
      where,
      include: {
        warung: { select: { id: true, nama: true, kode: true } },
        menu: { select: { id: true, nama: true, harga: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: warungMenus })
  } catch (error) {
    console.error('[GET /api/admin/warung-menu]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const body = await request.json()
    const { warungId, menuId, harga } = body

    if (!warungId || !menuId || harga === undefined || harga === null) {
      return NextResponse.json({ success: false, message: 'warungId, menuId, dan harga wajib diisi.' }, { status: 422 })
    }

    if (isNaN(Number(harga)) || Number(harga) < 0) {
      return NextResponse.json({ success: false, message: 'Harga harus angka positif.' }, { status: 422 })
    }

    const warung = await prisma.warung.findUnique({ where: { id: warungId } })
    if (!warung) {
      return NextResponse.json({ success: false, message: 'Warung tidak ditemukan.' }, { status: 404 })
    }

    const menu = await prisma.menu.findUnique({ where: { id: menuId } })
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu tidak ditemukan.' }, { status: 404 })
    }

    const warungMenu = await prisma.warungMenu.upsert({
      where: { warungId_menuId: { warungId, menuId } },
      update: { harga: Number(harga) },
      create: { warungId, menuId, harga: Number(harga) },
      include: {
        warung: { select: { id: true, nama: true, kode: true } },
        menu: { select: { id: true, nama: true, harga: true } },
      },
    })

    return NextResponse.json({ success: true, data: warungMenu })
  } catch (error) {
    console.error('[POST /api/admin/warung-menu]', error)
    return NextResponse.json({ success: false, message: 'Gagal menyimpan.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const warungId = searchParams.get('warung_id')
    const menuId = searchParams.get('menu_id')

    if (!warungId || !menuId) {
      return NextResponse.json({ success: false, message: 'warung_id dan menu_id wajib.' }, { status: 422 })
    }

    await prisma.warungMenu.delete({
      where: { warungId_menuId: { warungId, menuId } },
    })

    return NextResponse.json({ success: true, message: 'Harga override dihapus.' })
  } catch (error) {
    console.error('[DELETE /api/admin/warung-menu]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus.' }, { status: 500 })
  }
}
