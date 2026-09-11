import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)

    let warungId: string | null = null

    if (requireRole(context, 'OWNER') === null) {
      const { searchParams } = new URL(request.url)
      warungId = searchParams.get('warungId')
      if (!warungId) {
        return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
      }
    } else if (requireRole(context, 'KASIR') === null) {
      warungId = context?.warungId ?? null
      if (!warungId) {
        return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sesi = await prisma.kasirSesi.findUnique({
      where: {
        warungId_tanggal: {
          warungId: warungId!,
          tanggal: today,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        hariIni: today.toISOString().split('T')[0],
        sudahTutup: !!sesi,
        ditutupPada: sesi?.ditutupPada || null,
        totalTransaksi: sesi?.totalTransaksi || 0,
        totalPendapatan: sesi?.totalPendapatan || 0,
      },
    })
  } catch (error) {
    console.error('[GET /api/kasir/status]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil status kasir.' }, { status: 500 })
  }
}
