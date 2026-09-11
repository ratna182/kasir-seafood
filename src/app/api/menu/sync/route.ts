import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decodeSessionToken, COOKIE_OWNER } from '@/lib/session'
import { syncMenusAcrossWarungs } from '@/lib/menu-sync'

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

    const [warungs, allMenus] = await Promise.all([
      prisma.warung.findMany({ orderBy: { kode: 'asc' } }),
      prisma.menu.findMany({ orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }] }),
    ])

    if (warungs.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada warung.' }, { status: 404 })
    }

    if (allMenus.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada menu sama sekali. Buat menu dulu.' }, { status: 404 })
    }

    // Deduplicate by nama — ambil yang paling lengkap
    const menuMap = new Map<string, { nama: string; harga: number; isAktif: boolean }>()
    for (const m of allMenus) {
      const existing = menuMap.get(m.nama)
      if (!existing || (!existing.isAktif && m.isAktif)) {
        menuMap.set(m.nama, { nama: m.nama, harga: m.harga, isAktif: m.isAktif })
      }
    }

    const uniqueMenus = Array.from(menuMap.values())

    await syncMenusAcrossWarungs()

    return NextResponse.json({
      success: true,
      message: `${uniqueMenus.length} menu disinkronkan ke ${warungs.length} warung.`,
      data: { syncedWarungs: warungs.length, menuCount: uniqueMenus.length },
    })
  } catch (error) {
    console.error('[POST /api/menu/sync]', error)
    return NextResponse.json({ success: false, message: 'Gagal sync menu.' }, { status: 500 })
  }
}
