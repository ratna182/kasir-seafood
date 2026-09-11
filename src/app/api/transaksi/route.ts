import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'

type IncomingItem = {
  menuId: string
  qty: number
}

function todayRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { today, tomorrow }
}

function isUniqueOpenOrderError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// POST /api/transaksi - buat/append order sementara (kasir only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const { today } = todayRange()
    const kasirSesiTutup = await prisma.kasirSesi.findUnique({
      where: { warungId_tanggal: { warungId, tanggal: today } },
    })

    if (kasirSesiTutup) {
      return NextResponse.json({
        success: false,
        message: 'Kasir sudah ditutup. Transaksi baru dapat dibuat mulai besok.',
      }, { status: 409 })
    }

    const body = await request.json()
    const nomorMeja = body.nomorMeja?.toString().trim()
    const items = body.items as IncomingItem[] | undefined

    if (!nomorMeja) {
      return NextResponse.json({ success: false, message: 'Nomor meja wajib diisi.' }, { status: 422 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Tambahkan minimal 1 item pesanan.' }, { status: 422 })
    }

    const qtyByMenuId = new Map<string, number>()
    for (const item of items) {
      const qty = Number(item.qty)
      if (!item.menuId || !Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ success: false, message: 'Qty harus minimal 1.' }, { status: 422 })
      }
      qtyByMenuId.set(item.menuId, (qtyByMenuId.get(item.menuId) || 0) + qty)
    }

    const menuIds = [...qtyByMenuId.keys()]
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds }, warungId, isAktif: true },
    })

    if (menus.length !== menuIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Beberapa menu tidak valid atau sudah tidak aktif.',
      }, { status: 422 })
    }

    const processedItems = menus.map((menu) => {
      const qty = qtyByMenuId.get(menu.id) || 0
      return {
        menuId: menu.id,
        namaMenu: menu.nama,
        hargaSatuan: menu.harga,
        qty,
        subtotal: menu.harga * qty,
      }
    })
    const addedTotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0)

    const transaksi = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaksi.findFirst({
        where: { warungId, nomorMeja, status: 'OPEN' },
      })

      if (!existing) {
        return tx.transaksi.create({
          data: {
            warungId,
            nomorMeja,
            status: 'OPEN',
            total: addedTotal,
            tanggal: today,
            items: { create: processedItems },
          },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        })
      }

      await tx.transaksiItem.createMany({
        data: processedItems.map((item) => ({ ...item, transaksiId: existing.id })),
      })

      return tx.transaksi.update({
        where: { id: existing.id },
        data: { total: existing.total + addedTotal },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    })

    return NextResponse.json({ success: true, data: transaksi }, { status: 201 })
  } catch (error) {
    if (isUniqueOpenOrderError(error)) {
      return NextResponse.json({
        success: false,
        message: 'Meja ini sudah ada order aktif, refresh dan lanjutkan order yang sudah ada.',
      }, { status: 409 })
    }

    console.error('[POST /api/transaksi]', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal menyimpan pesanan. Silakan coba lagi.',
    }, { status: 500 })
  }
}

// GET /api/transaksi - daftar transaksi selesai hari ini (kasir only)
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const { today, tomorrow } = todayRange()
    const transaksis = await prisma.transaksi.findMany({
      where: { warungId, tanggal: { gte: today, lt: tomorrow }, status: 'SELESAI' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: transaksis })
  } catch (error) {
    console.error('[GET /api/transaksi]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil transaksi.' }, { status: 500 })
  }
}
