import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'
import { getKasirSessionState } from '@/lib/kasir-session'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    const authError = await requireKasirAccess(context)
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    let warungId = body.warungId

    if (context?.user.role === 'KASIR') {
      warungId = await getKasirWarungId(context)
    } else if (!warungId) {
      return NextResponse.json({ success: false, message: 'warungId wajib diisi.' }, { status: 400 })
    }

    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const openedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const state = await getKasirSessionState(tx, warungId, openedAt)
      if (!state.latest || !state.isClosed) return false

      const updated = await tx.kasirSesi.updateMany({
        where: { id: state.latest.id, dibukaKembaliPada: null },
        data: { dibukaKembaliPada: openedAt },
      })
      return updated.count === 1
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
