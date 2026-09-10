import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { apiRateLimiter } from '@/lib/rate-limiter'

function checkRateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  const result = apiRateLimiter.check(`transaksi-open:${ip}`)

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' },
      { status: 429 }
    )
  }

  return null
}

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError

  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'KASIR')
    if (authError) return authError

    const warungId = context?.warungId
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const nomorMeja = request.nextUrl.searchParams.get('nomorMeja')?.trim()
    const transaksis = await prisma.transaksi.findMany({
      where: { warungId, status: 'OPEN', ...(nomorMeja ? { nomorMeja } : {}) },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: nomorMeja ? transaksis[0] ?? null : transaksis })
  } catch (error) {
    console.error('[GET /api/transaksi/open]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil meja aktif.' }, { status: 500 })
  }
}
