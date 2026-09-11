import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    let warungId = body.warungId

    if (context?.user.role === 'KASIR') {
      warungId = await getKasirWarungId(context)
    } else if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
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
