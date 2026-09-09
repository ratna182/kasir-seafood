import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole, requireWarungAccess } from '@/lib/auth'

// POST /api/transaksi — buat transaksi baru (kasir only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya kasir yang boleh buat transaksi
    const authError = requireRole(context, 'KASIR')
    if (authError) return authError

    const warungId = context?.warungId
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    // Cek apakah kasir sudah ditutup hari ini
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const kasirSesiTutup = await prisma.kasirSesi.findUnique({
      where: {
        warungId_tanggal: {
          warungId,
          tanggal: today,
        },
      },
    })

    if (kasirSesiTutup) {
      return NextResponse.json({
        success: false,
        message: 'Kasir sudah ditutup. Transaksi baru dapat dibuat mulai besok.',
      }, { status: 409 })
    }

    const body = await request.json()
    const { nomorMeja, items } = body

    // Validasi
    if (!nomorMeja || !nomorMeja.toString().trim()) {
      return NextResponse.json({ success: false, message: 'Nomor meja wajib diisi.' }, { status: 422 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Tambahkan minimal 1 item pesanan.' }, { status: 422 })
    }

    // Validasi dan ambil data menu (pastikan milik warung ini)
    const menuIds = items.map((item: { menuId: string }) => item.menuId)
    const menus = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        warungId,
        isAktif: true,
      },
    })

    if (menus.length !== menuIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Beberapa menu tidak valid atau sudah tidak aktif.',
      }, { status: 422 })
    }

    // Hitung total dan siapkan items dengan snapshot harga
    const menuMap = new Map(menus.map((m: { id: string; nama: string; harga: number }) => [m.id, m]))
    let total = 0
    const processedItems: {
      menuId: string
      namaMenu: string
      hargaSatuan: number
      qty: number
      subtotal: number
    }[] = []

    for (const item of items) {
      const qty = Number(item.qty)
      if (!qty || qty < 1) {
        return NextResponse.json({ success: false, message: 'Qty harus minimal 1.' }, { status: 422 })
      }

      const menu = menuMap.get(item.menuId)
      if (!menu) continue

      const subtotal = menu.harga * qty
      total += subtotal

      processedItems.push({
        menuId: menu.id,
        namaMenu: menu.nama,        // Snapshot nama
        hargaSatuan: menu.harga,    // Snapshot harga
        qty,
        subtotal,
      })
    }

    // Buat transaksi dalam satu transaction database
    const transaksi = await prisma.$transaction(async (tx: any) => {
      const newTransaksi = await tx.transaksi.create({
        data: {
          warungId,
          nomorMeja: nomorMeja.toString().trim(),
          status: 'SELESAI',
          total,
          tanggal: today,
          printedAt: new Date(),
          items: {
            create: processedItems,
          },
        },
        include: { items: true },
      })
      return newTransaksi
    })

    return NextResponse.json({ success: true, data: transaksi }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/transaksi]', error)
    return NextResponse.json({
      success: false,
      message: 'Gagal menyimpan pesanan. Silakan coba lagi.',
    }, { status: 500 })
  }
}

// GET /api/transaksi — daftar transaksi hari ini (kasir only)
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya kasir yang boleh lihat transaksi hari ini
    const authError = requireRole(context, 'KASIR')
    if (authError) return authError

    const warungId = context?.warungId
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        tanggal: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: transaksis })
  } catch (error) {
    console.error('[GET /api/transaksi]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil transaksi.' }, { status: 500 })
  }
}
