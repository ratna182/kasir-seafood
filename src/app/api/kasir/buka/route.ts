import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireKasirAccess } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'
import { recordActivity } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    const body = await request.json().catch(() => ({}))
    let warungId = body.warungId

    if (context) {
      const authError = await requireKasirAccess(context)
      if (authError) return authError
      if (context.user.role === 'KASIR') {
        warungId = context.warungId ?? warungId
      }
    }

    if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    // Ambil userId untuk pencatatan activity
    const userId = context?.user.id ?? (
      await prisma.user.findFirst({ where: { role: 'KASIR', warungId }, select: { id: true } })
    )?.id

    const openedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const state = await getKasirSessionState(tx, warungId, openedAt)

      // Kasus 1: Sudah ada sesi yang ditutup → buka kembali
      if (state.latest && state.isClosed) {
        const updated = await tx.kasirSesi.updateMany({
          where: { id: state.latest.id, dibukaKembaliPada: null },
          data: { dibukaKembaliPada: openedAt },
        })
        if (updated.count === 1 && userId) {
          await recordActivity(tx, {
            userId,
            warungId,
            aktivitas: 'BUKA_KASIR',
            detail: 'Sesi kasir dibuka kembali',
          })
        }
        return updated.count === 1
      }

      // Kasus 2: Sudah ada sesi yang terbuka → tidak bisa buka lagi
      if (state.latest && !state.isClosed) return false

      // Kasus 3: Belum ada sesi hari ini → buat sesi baru
      await tx.kasirSesi.create({
        data: {
          warungId,
          tanggal: state.today,
          dibukaKembaliPada: openedAt,
          ditutupOleh: userId!,
          totalTransaksi: 0,
          totalPendapatan: 0,
        },
      })
      if (userId) {
        await recordActivity(tx, {
          userId,
          warungId,
          aktivitas: 'BUKA_KASIR',
          detail: 'Sesi kasir baru dibuka',
        })
      }
      return true
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Kasir hari ini sudah terbuka.',
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      message: 'Kasir berhasil dibuka dengan sesi transaksi baru.',
    })
  } catch (error) {
    console.error('[POST /api/kasir/buka]', error)
    return NextResponse.json({ success: false, message: 'Gagal membuka kasir.' }, { status: 500 })
  }
}
