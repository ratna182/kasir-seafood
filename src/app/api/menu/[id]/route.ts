import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isOwner, requireRole, requireWarungAccess } from '@/lib/auth'
import { syncMenusAcrossWarungs } from '@/lib/menu-sync'

// PUT /api/menu/:id — update menu + auto sync
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const { nama, kategori, harga, isAktif } = body

    const menu = await prisma.menu.findFirst({ where: { id } })
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu tidak ditemukan.' }, { status: 404 })
    }

    const warungAccessError = requireWarungAccess(context, menu.warungId)
    if (warungAccessError) return warungAccessError

    const errors: Record<string, string> = {}
    if (nama !== undefined && !nama.trim()) errors.nama = 'Nama menu tidak boleh kosong.'
    if (kategori !== undefined && !['MAKANAN', 'MINUMAN'].includes(kategori)) errors.kategori = 'Kategori tidak valid.'
    if (harga !== undefined && (isNaN(Number(harga)) || Number(harga) < 0)) errors.harga = 'Harga harus angka positif.'

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 422 })
    }

    // Cek duplikat nama di SEMUA warung
    if (nama && nama.trim() !== menu.nama) {
      const existing = await prisma.menu.findFirst({
        where: { nama: nama.trim() },
      })
      if (existing) {
        return NextResponse.json({ success: false, errors: { nama: 'Nama menu sudah ada.' } }, { status: 422 })
      }
    }

    const updated = await prisma.menu.update({
      where: { id },
      data: {
        ...(nama !== undefined && { nama: nama.trim() }),
        ...(kategori !== undefined && { kategori }),
        ...(harga !== undefined && { harga: Number(harga) }),
        ...(isAktif !== undefined && { isAktif }),
      },
    })

    // Auto sync ke semua warung
    await syncMenusAcrossWarungs()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PUT /api/menu/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengupdate menu.' }, { status: 500 })
  }
}

// DELETE /api/menu/:id — hapus menu + auto sync
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params

    const menu = await prisma.menu.findFirst({ where: { id } })
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu tidak ditemukan.' }, { status: 404 })
    }

    const warungAccessError = requireWarungAccess(context, menu.warungId)
    if (warungAccessError) return warungAccessError

    const usedInTransaksi = await prisma.transaksiItem.findFirst({
      where: { menuId: id },
    })

    if (usedInTransaksi) {
      return NextResponse.json({
        success: false,
        message: 'Menu tidak dapat dihapus karena sudah ada dalam transaksi. Nonaktifkan saja.',
      }, { status: 409 })
    }

    await prisma.menu.delete({ where: { id } })

    // Auto sync ke semua warung
    await syncMenusAcrossWarungs()

    return NextResponse.json({ success: true, message: 'Menu berhasil dihapus.' })
  } catch (error) {
    console.error('[DELETE /api/menu/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus menu.' }, { status: 500 })
  }
}
