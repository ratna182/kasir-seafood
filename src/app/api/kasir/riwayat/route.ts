import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const { searchParams } = new URL(request.url)
    const warungIdParam = searchParams.get('warung_id')
    const mulai = searchParams.get('mulai')
    const sampai = searchParams.get('sampai')

    let warungId: string | null = null

    if (context) {
      if (requireRole(context, 'OWNER') === null) {
        warungId = warungIdParam
      } else if (requireRole(context, 'KASIR') === null) {
        warungId = context?.warungId ?? null
      } else {
        return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 })
      }
    } else {
      warungId = warungIdParam
    }

    if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    const where: Record<string, unknown> = { warungId }

    if (/^\d{4}-\d{2}-\d{2}$/.test(mulai || '') || /^\d{4}-\d{2}-\d{2}$/.test(sampai || '')) {
      const tanggalFilter: Record<string, Date> = {}
      if (mulai) tanggalFilter.gte = new Date(`${mulai}T00:00:00.000Z`)
      if (sampai) tanggalFilter.lte = new Date(`${sampai}T23:59:59.999Z`)
      where.tanggal = tanggalFilter
    }

    const sessions = await prisma.kasirSesi.findMany({
      where,
      include: {
        user: { select: { namaLengkap: true, username: true } },
        warung: { select: { nama: true, kode: true } },
      },
      orderBy: [{ tanggal: 'desc' }, { ditutupPada: 'desc' }],
    })

    const data = sessions.map((s) => ({
      id: s.id,
      tanggal: s.tanggal.toISOString().split('T')[0],
      ditutupPada: s.ditutupPada.toISOString(),
      dibukaKembaliPada: s.dibukaKembaliPada?.toISOString() ?? null,
      ditutupOleh: s.user.namaLengkap || s.user.username,
      totalTransaksi: s.totalTransaksi,
      totalPendapatan: s.totalPendapatan,
      warungNama: s.warung.nama,
      warungKode: s.warung.kode,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/kasir/riwayat]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil riwayat kasir.' }, { status: 500 })
  }
}
