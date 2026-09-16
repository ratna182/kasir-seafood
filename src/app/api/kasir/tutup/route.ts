import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'
import { recordActivity } from '@/lib/activity-log'

// POST /api/kasir/tutup — tutup kasir hari ini
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)

    const body = await request.json().catch(() => ({}))
    const warungId = body.warungId?.toString()
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    // Validasi warung ada
    const warung = await prisma.warung.findUnique({ where: { id: warungId }, select: { id: true } })
    if (!warung) {
      return NextResponse.json({ success: false, message: 'Warung tidak ditemukan.' }, { status: 400 })
    }

    // Cari user untuk ditutupOleh — wajib ada minimal 1 user di DB
    const fallbackUser = await prisma.user.findFirst({ select: { id: true } })
    const userId = context?.user.id ?? fallbackUser?.id
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Tidak ada user di sistem. Buat user terlebih dahulu.' }, { status: 500 })
    }

    const closedAt = new Date()

    // Cek state kasir
    const state = await getKasirSessionState(prisma, warungId, closedAt)
    if (state.isClosed) {
      return NextResponse.json({
        success: false,
        message: `Kasir sudah ditutup pada ${new Date(state.latest!.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
      }, { status: 409 })
    }

    // Cek pesanan open
    const openOrders = await prisma.transaksi.findMany({
      where: { warungId, status: 'OPEN', createdAt: { gte: state.sessionStart } },
      select: { nomorMeja: true },
    })
    if (openOrders.length > 0) {
      const meja = openOrders.map((o) => o.nomorMeja).join(', ')
      return NextResponse.json({
        success: false,
        message: `Masih ada pesanan yang belum dibayar di ${meja}. Selesaikan atau hapus pesanan tersebut sebelum tutup kasir.`,
      }, { status: 409 })
    }

    // Batalikan pesanan OPEN lama
    await prisma.transaksi.updateMany({
      where: { warungId, status: 'OPEN', createdAt: { lt: state.sessionStart } },
      data: { status: 'BATAL' },
    })

    // Hitung total
    const transaksis = await prisma.transaksi.findMany({
      where: { warungId, createdAt: { gte: state.sessionStart, lte: closedAt }, status: 'SELESAI' },
      select: { total: true },
    })
    const totalTransaksi = transaksis.length
    const totalPendapatan = transaksis.reduce((sum, t) => sum + t.total, 0)

    // Simpan sesi tutup
    const sesi = await prisma.kasirSesi.create({
      data: {
        warungId,
        tanggal: state.today,
        ditutupOleh: userId,
        ditutupPada: closedAt,
        totalTransaksi,
        totalPendapatan,
      },
    })

    // Catat activity (best effort — jangan gagalkan tutup karena activity log)
    try {
      await recordActivity(prisma, {
        userId,
        warungId,
        aktivitas: 'TUTUP_KASIR',
        detail: `Kasir ditutup, ${totalTransaksi} transaksi, pendapatan Rp ${totalPendapatan.toLocaleString('id-ID')}`,
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        tanggal: state.today.toISOString().split('T')[0],
        ditutupPada: sesi.ditutupPada,
        totalTransaksi,
        totalPendapatan,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/kasir/tutup]', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: `Gagal menutup kasir: ${msg}` }, { status: 500 })
  }
}
