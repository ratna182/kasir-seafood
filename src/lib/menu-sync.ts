import { prisma } from '@/lib/prisma'

type SharedMenu = {
  nama: string
  kategori: 'MAKANAN' | 'MINUMAN'
  harga: number
  isAktif: boolean
}

async function getSharedMenus(): Promise<SharedMenu[]> {
  const masterWarung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  if (!masterWarung) return []

  return prisma.menu.findMany({
    where: { warungId: masterWarung.id },
    select: { nama: true, kategori: true, harga: true, isAktif: true },
    orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
  })
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

export async function getMasterWarungId() {
  const warung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  return warung?.id ?? null
}
