import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'
import { recordActivity } from '@/lib/activity-log'

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

    const openedAt = new Date()

    // Cek state kasir
    const state = await getKasirSessionState(prisma, warungId, openedAt)

    // Kasus 1: Sudah ada sesi yang ditutup → buka kembali
    if (state.latest && state.isClosed) {
      const updated = await prisma.kasirSesi.updateMany({
        where: { id: state.latest.id, dibukaKembaliPada: null },
        data: { dibukaKembaliPada: openedAt },
      })
      if (updated.count === 1) {
        try {
          await recordActivity(prisma, {
            userId,
            warungId,
            aktivitas: 'BUKA_KASIR',
            detail: 'Sesi kasir dibuka kembali',
          })
        } catch { /* ignore */ }
      }
      return NextResponse.json({
        success: true,
        message: 'Kasir berhasil dibuka kembali.',
      })
    }

    // Kasus 2: Sudah ada sesi yang terbuka → tidak bisa buka lagi
    if (state.latest && !state.isClosed) {
      return NextResponse.json({
        success: false,
        message: 'Kasir hari ini sudah terbuka.',
      }, { status: 409 })
    }

    // Kasus 3: Belum ada sesi hari ini → buat sesi baru
    await prisma.kasirSesi.create({
      data: {
        warungId,
        tanggal: state.today,
        dibukaKembaliPada: openedAt,
        ditutupOleh: userId,
        totalTransaksi: 0,
        totalPendapatan: 0,
      },
    })
    try {
      await recordActivity(prisma, {
        userId,
        warungId,
        aktivitas: 'BUKA_KASIR',
        detail: 'Sesi kasir baru dibuka',
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      message: 'Kasir berhasil dibuka dengan sesi transaksi baru.',
    })
  } catch (error) {
    console.error('[POST /api/kasir/buka]', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: `Gagal membuka kasir: ${msg}` }, { status: 500 })
  }
}
