import { prisma } from '@/lib/prisma'

/**
 * Auto-sync: pastikan semua warung punya menu yang sama.
 * Dipanggil setelah menu ditambah/diubah/dihapus.
 */
export async function syncMenusAcrossWarungs() {
  const warungs = await prisma.warung.findMany()
  if (warungs.length === 0) return

  // Ambil semua menu dari semua warung
  const allMenus = await prisma.menu.findMany()

  // Deduplicate by nama — ambil yang aktif jika ada
  const menuMap = new Map<string, { nama: string; kategori: 'MAKANAN' | 'MINUMAN'; harga: number; isAktif: boolean }>()
  for (const m of allMenus) {
    const existing = menuMap.get(m.nama)
    if (!existing || (!existing.isAktif && m.isAktif)) {
      menuMap.set(m.nama, { nama: m.nama, kategori: m.kategori, harga: m.harga, isAktif: m.isAktif })
    }
  }

  const uniqueMenus = Array.from(menuMap.values())

  // Sync ke semua warung
  for (const warung of warungs) {
    await prisma.menu.deleteMany({ where: { warungId: warung.id } })
    if (uniqueMenus.length > 0) {
      await prisma.menu.createMany({
        data: uniqueMenus.map((m) => ({
          warungId: warung.id,
          nama: m.nama,
          kategori: m.kategori,
          harga: m.harga,
          isAktif: m.isAktif,
        })),
      })
    }
  }
}
