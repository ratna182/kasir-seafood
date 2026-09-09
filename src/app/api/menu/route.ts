import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isOwner, requireRole, requireWarungAccess } from '@/lib/auth'

// GET /api/menu — ambil menu berdasarkan warung_id query param
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER') ?? null
    
    // Jika bukan owner, cek warung access
    if (!isOwner(context)) {
      const warungAccessError = requireWarungAccess(context, context?.warungId ?? '')
      if (warungAccessError) return warungAccessError
    }

    const { searchParams } = new URL(request.url)
    const warungId = searchParams.get('warung_id')

    // Build where clause
    const where: any = {}
    
    if (isOwner(context)) {
      // Owner bisa filter by warung_id atau lihat semua
      if (warungId) {
        where.warungId = warungId
      }
    } else {
      // Kasir hanya bisa lihat warungnya sendiri
      where.warungId = context?.warungId
    }

    const menus = await prisma.menu.findMany({
      where,
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    })

    return NextResponse.json({ success: true, data: menus })
  } catch (error) {
    console.error('[GET /api/menu]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data menu.' }, { status: 500 })
  }
}

// POST /api/menu — tambah menu baru (owner only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya owner yang boleh tambah menu
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const body = await request.json()
    const { warungId, nama, kategori, harga } = body

    // Validasi warungId wajib untuk owner
    if (!warungId) {
      return NextResponse.json({ success: false, errors: { warungId: 'Warung wajib dipilih.' } }, { status: 422 })
    }

    // Validasi warung access
    const warungAccessError = requireWarungAccess(context, warungId)
    if (warungAccessError) return warungAccessError

    // Validasi
    if (!nama || !nama.trim()) {
      return NextResponse.json({ success: false, errors: { nama: 'Nama menu wajib diisi.' } }, { status: 422 })
    }
    if (!kategori || !['MAKANAN', 'MINUMAN'].includes(kategori)) {
      return NextResponse.json({ success: false, errors: { kategori: 'Kategori harus Makanan atau Minuman.' } }, { status: 422 })
    }
    if (harga === undefined || harga === null || isNaN(Number(harga)) || Number(harga) < 0) {
      return NextResponse.json({ success: false, errors: { harga: 'Harga harus angka positif.' } }, { status: 422 })
    }

    // Cek duplikat nama dalam warung yang sama
    const existing = await prisma.menu.findUnique({
      where: { warungId_nama: { warungId, nama: nama.trim() } },
    })
    if (existing) {
      return NextResponse.json({ success: false, errors: { nama: 'Nama menu sudah ada.' } }, { status: 422 })
    }

    const menu = await prisma.menu.create({
      data: {
        warungId,
        nama: nama.trim(),
        kategori,
        harga: Number(harga),
        isAktif: true,
      },
    })

    return NextResponse.json({ success: true, data: menu }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/menu]', error)
    return NextResponse.json({ success: false, message: 'Gagal menyimpan menu.' }, { status: 500 })
  }
}
