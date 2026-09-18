import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }
    const kasirId = context!.user.id

    const nomorMeja = request.nextUrl.searchParams.get('nomorMeja')?.trim()
    const state = await getKasirSessionState(prisma, warungId, kasirId)
    if (state.isClosed) {
      return NextResponse.json({ success: true, data: nomorMeja ? null : [] })
    }

    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        kasirId,
        status: 'OPEN',
        createdAt: { gte: state.sessionStart },
        ...(nomorMeja ? { nomorMeja } : {}),
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: nomorMeja ? transaksis[0] ?? null : transaksis })
  } catch (error) {
    console.error('[GET /api/transaksi/open]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil meja aktif.' }, { status: 500 })
  }
}
