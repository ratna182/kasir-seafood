import { prisma } from '@/lib/prisma'

type SharedMenu = {
  nama: string
  kategori: 'MAKANAN' | 'MINUMAN'
  harga: number
  isAktif: boolean
}

async function getSharedMenus(): Promise<SharedMenu[]> {
  const allMenus = await prisma.menu.findMany({ orderBy: { createdAt: 'asc' } })
  const menuMap = new Map<string, SharedMenu>()

  for (const menu of allMenus) {
    const existing = menuMap.get(menu.nama)
    if (!existing || (!existing.isAktif && menu.isAktif)) {
      menuMap.set(menu.nama, {
        nama: menu.nama,
        kategori: menu.kategori,
        harga: menu.harga,
        isAktif: menu.isAktif,
      })
    }
  }

  return [...menuMap.values()]
}

// Tidak menghapus menu agar riwayat transaksi yang mereferensikannya tetap aman.
export async function syncWarungMenus(warungId: string) {
  const menus = await getSharedMenus()
  await Promise.all(menus.map((menu) => prisma.menu.upsert({
    where: { warungId_nama: { warungId, nama: menu.nama } },
    update: { kategori: menu.kategori, harga: menu.harga, isAktif: menu.isAktif },
    create: { warungId, ...menu },
  })))
}

export async function syncMenusAcrossWarungs() {
  const warungs = await prisma.warung.findMany({ select: { id: true } })
  await Promise.all(warungs.map((warung) => syncWarungMenus(warung.id)))
}
