import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getKasirWarungId, requireKasirAccess } from '@/lib/auth'

// POST /api/kasir/tutup — tutup kasir hari ini (kasir only)
export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    
    // Hanya kasir yang boleh tutup kasir
    const authError = requireKasirAccess(context)
    if (authError) return authError

    const warungId = await getKasirWarungId(context)
    if (!warungId) {
      return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Cek apakah sudah ditutup
    const existing = await prisma.kasirSesi.findUnique({
      where: {
        warungId_tanggal: {
          warungId,
          tanggal: today,
        },
      },
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        message: `Kasir hari ini sudah ditutup pada ${new Date(existing.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
      }, { status: 409 })
    }

    // Hitung total transaksi dan pendapatan hari ini
    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        tanggal: { gte: today, lt: tomorrow },
        status: 'SELESAI',
      },
      select: { total: true },
    })

    const totalTransaksi = transaksis.length
    const totalPendapatan = transaksis.reduce((sum: number, t: { total: number }) => sum + t.total, 0)

    // Buat record tutup kasir
    const sesi = await prisma.kasirSesi.create({
      data: {
        warungId,
        tanggal: today,
        ditutupOleh: context?.user.id ?? '',
        totalTransaksi,
        totalPendapatan,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        tanggal: today.toISOString().split('T')[0],
        ditutupPada: sesi.ditutupPada,
        totalTransaksi,
        totalPendapatan,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/kasir/tutup]', error)
    return NextResponse.json({ success: false, message: 'Gagal menutup kasir.' }, { status: 500 })
  }
}
