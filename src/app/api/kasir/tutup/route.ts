import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'
import { recordActivity } from '@/lib/activity-log'

// POST /api/kasir/tutup — tutup kasir hari ini (kasir only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya kasir yang boleh tutup kasir
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const warungId = context?.user.role === 'OWNER'
      ? body.warungId?.toString()
      : await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    const closedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const state = await getKasirSessionState(tx, warungId, closedAt)
      if (state.isClosed) return { status: 'ALREADY_CLOSED' as const, state }

      const openOrders = await tx.transaksi.findMany({
        where: {
          warungId,
          status: 'OPEN',
          createdAt: { gte: state.sessionStart },
        },
        select: { nomorMeja: true },
      })
      if (openOrders.length > 0) return { status: 'OPEN_ORDERS' as const, openOrders }

      await tx.transaksi.updateMany({
        where: { warungId, status: 'OPEN', createdAt: { lt: state.sessionStart } },
        data: { status: 'BATAL' },
      })

      const transaksis = await tx.transaksi.findMany({
        where: {
          warungId,
          createdAt: { gte: state.sessionStart, lte: closedAt },
          status: 'SELESAI',
        },
        select: { total: true },
      })
      const totalTransaksi = transaksis.length
      const totalPendapatan = transaksis.reduce((sum, transaksi) => sum + transaksi.total, 0)

      const sesi = await tx.kasirSesi.create({
        data: {
          warungId,
          tanggal: state.today,
          ditutupOleh: context!.user.id,
          ditutupPada: closedAt,
          totalTransaksi,
          totalPendapatan,
        },
      })

      await recordActivity(tx, {
        userId: context!.user.id,
        warungId,
        aktivitas: 'TUTUP_KASIR',
        detail: `Kasir ditutup, ${totalTransaksi} transaksi, pendapatan Rp ${totalPendapatan.toLocaleString('id-ID')}`,
      })

      return { status: 'CLOSED' as const, sesi, totalTransaksi, totalPendapatan, today: state.today }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.status === 'ALREADY_CLOSED') {
      return NextResponse.json({
        success: false,
        message: `Kasir sudah ditutup pada ${new Date(result.state.latest!.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
      }, { status: 409 })
    }

    if (result.status === 'OPEN_ORDERS') {
      const meja = result.openOrders.map((order) => order.nomorMeja).join(', ')
      return NextResponse.json({
        success: false,
        message: `Masih ada pesanan yang belum dibayar di ${meja}. Selesaikan atau hapus pesanan tersebut sebelum tutup kasir.`,
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      data: {
        tanggal: result.today.toISOString().split('T')[0],
        ditutupPada: result.sesi.ditutupPada,
        totalTransaksi: result.totalTransaksi,
        totalPendapatan: result.totalPendapatan,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/kasir/tutup]', error)
    return NextResponse.json({ success: false, message: 'Gagal menutup kasir.' }, { status: 500 })
  }
}
