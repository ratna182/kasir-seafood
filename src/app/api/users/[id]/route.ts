import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// PUT /api/users/:id — update akun kasir
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    
    // Hanya owner yang boleh update akun kasir
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const { namaLengkap, password, isActive } = body

    // Cari user
    const user = await prisma.user.findFirst({
      where: { id, role: 'KASIR' },
    })
    if (!user) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 })
    }

    // Update data
    const updateData: any = {}
    
    if (namaLengkap !== undefined) {
      updateData.namaLengkap = namaLengkap?.trim() || null
    }
    
    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PUT /api/users/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengupdate user.' }, { status: 500 })
  }
}

// DELETE /api/users/:id — hapus akun kasir
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = getAuthContext(request)
    
    // Hanya owner yang boleh hapus akun kasir
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const { id } = await params

    // Cari user
    const user = await prisma.user.findFirst({
      where: { id, role: 'KASIR' },
    })
    if (!user) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan.' }, { status: 404 })
    }

    // Cek apakah user sudah punya transaksi
    const hasTransaksi = await prisma.kasirSesi.findFirst({
      where: { ditutupOleh: id },
    })
    if (hasTransaksi) {
      return NextResponse.json({
        success: false,
        message: 'Tidak dapat menghapus user yang sudah pernah menutup kasir. Nonaktifkan saja.',
      }, { status: 409 })
    }

    // Hapus user
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'User berhasil dihapus.' })
  } catch (error) {
    console.error('[DELETE /api/users/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus user.' }, { status: 500 })
  }
}
