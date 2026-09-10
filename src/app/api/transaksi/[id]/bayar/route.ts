import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import { apiRateLimiter } from '@/lib/rate-limiter'

function checkRateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  const result = apiRateLimiter.check(`transaksi-bayar:${ip}`)

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, message: 'Terlalu banyak request. Coba lagi sebentar.' },
      { status: 429 }
    )
  }

  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const body = await request.json()
    const metodePembayaran = body.metodePembayaran === 'QRIS' ? 'QRIS' : body.metodePembayaran === 'CASH' ? 'CASH' : null

    if (!metodePembayaran) {
      return NextResponse.json({ success: false, message: 'Metode bayar wajib dipilih.' }, { status: 422 })
    }

    const transaksi = await prisma.$transaction(async (tx) => {
      const openOrder = await tx.transaksi.findFirst({
        where: { id, warungId, status: 'OPEN' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })

      if (!openOrder) return null
      if (openOrder.items.length === 0 || openOrder.total < 1) return 'EMPTY'

      return tx.transaksi.update({
        where: { id },
        data: { status: 'SELESAI', metodePembayaran, printedAt: new Date() },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    })

    if (!transaksi) {
      return NextResponse.json({ success: false, message: 'Order aktif tidak ditemukan.' }, { status: 404 })
    }

    if (transaksi === 'EMPTY') {
      return NextResponse.json({ success: false, message: 'Order belum punya item pesanan.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, data: transaksi })
  } catch (error) {
    console.error('[POST /api/transaksi/[id]/bayar]', error)
    return NextResponse.json({ success: false, message: 'Gagal memproses pembayaran.' }, { status: 500 })
  }
}
