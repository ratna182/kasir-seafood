import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'

const DAILY_TRANSACTION_LIMIT = 150

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = getAuthContext(request)
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const metodePembayaran = body.metodePembayaran === 'QRIS' ? 'QRIS' : body.metodePembayaran === 'CASH' ? 'CASH' : body.metodePembayaran === 'TRANSFER' ? 'TRANSFER' : null

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

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const completedToday = await tx.transaksi.count({
        where: { warungId, status: 'SELESAI', tanggal: { gte: today, lt: tomorrow } },
      })
      if (completedToday >= DAILY_TRANSACTION_LIMIT) return 'LIMIT'

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

    if (transaksi === 'LIMIT') {
      return NextResponse.json({ success: false, message: `Batas ${DAILY_TRANSACTION_LIMIT} transaksi per cabang untuk hari ini sudah tercapai.` }, { status: 409 })
    }

    return NextResponse.json({ success: true, data: transaksi })
  } catch (error) {
    console.error('[POST /api/transaksi/[id]/bayar]', error)
    return NextResponse.json({ success: false, message: 'Gagal memproses pembayaran.' }, { status: 500 })
  }
}
