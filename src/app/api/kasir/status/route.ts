import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

// GET /api/kasir/status — cek status kasir hari ini (kasir only)
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya kasir yang boleh cek status kasir
    const authError = requireRole(context, 'KASIR')
    if (authError) return authError

    const warungId = context?.warungId
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sesi = await prisma.kasirSesi.findUnique({
      where: {
        warungId_tanggal: {
          warungId,
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
