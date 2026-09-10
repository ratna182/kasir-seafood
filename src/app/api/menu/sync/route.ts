import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decodeSessionToken, COOKIE_OWNER } from '@/lib/session'

// POST /api/menu/sync — gabung semua menu dari semua warung, lalu sync ke semua warung
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_OWNER)?.value
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: tidak ada session owner.' }, { status: 401 })
    }

    const session = decodeSessionToken(token)
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized: hanya owner yang bisa sync.' }, { status: 401 })
    }

    const warungs = await prisma.warung.findMany({ orderBy: { kode: 'asc' } })
    if (warungs.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada warung.' }, { status: 404 })
    }

    // Ambil SEMUA menu dari SEMUA warung
    const allMenus = await prisma.menu.findMany({
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    })

    if (allMenus.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada menu sama sekali. Buat menu dulu.' }, { status: 404 })
    }

    // Deduplicate by nama — ambil yang paling lengkap
    const menuMap = new Map<string, { nama: string; kategori: 'MAKANAN' | 'MINUMAN'; harga: number; isAktif: boolean }>()
    for (const m of allMenus) {
      const existing = menuMap.get(m.nama)
      if (!existing || (!existing.isAktif && m.isAktif)) {
        menuMap.set(m.nama, { nama: m.nama, kategori: m.kategori, harga: m.harga, isAktif: m.isAktif })
      }
    }

    const uniqueMenus = Array.from(menuMap.values())

    // Sync ke semua warung
    let synced = 0
    for (const warung of warungs) {
      await prisma.menu.deleteMany({ where: { warungId: warung.id } })
      await prisma.menu.createMany({
        data: uniqueMenus.map((m) => ({
          warungId: warung.id,
          nama: m.nama,
          kategori: m.kategori,
          harga: m.harga,
          isAktif: m.isAktif,
        })),
      })
      synced++
    }

    return NextResponse.json({
      success: true,
      message: `${uniqueMenus.length} menu disinkronkan ke ${synced} warung.`,
      data: { syncedWarungs: synced, menuCount: uniqueMenus.length },
    })
  } catch (error) {
    console.error('[POST /api/menu/sync]', error)
    return NextResponse.json({ success: false, message: 'Gagal sync menu.' }, { status: 500 })
  }
}
