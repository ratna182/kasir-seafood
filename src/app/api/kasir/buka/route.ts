import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const warungId = body.warungId
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.kasirSesi.findUnique({
      where: { warungId_tanggal: { warungId, tanggal: today } },
    })

    if (!existing) {
      return NextResponse.json({
        success: false,
        message: 'Kasir hari ini belum ditutup, tidak perlu dibuka.',
      }, { status: 409 })
    }

    await prisma.kasirSesi.delete({
      where: { warungId_tanggal: { warungId, tanggal: today } },
    })

    return NextResponse.json({
      success: true,
      message: 'Kasir hari ini berhasil dibuka kembali.',
    })
  } catch (error) {
    console.error('[POST /api/kasir/buka]', error)
    return NextResponse.json({ success: false, message: 'Gagal membuka kasir.' }, { status: 500 })
  }
}
