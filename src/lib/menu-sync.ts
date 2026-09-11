import { prisma } from '@/lib/prisma'

type SharedCategory = {
  nama: string
  sortOrder: number
  isAktif: boolean
}

type SharedMenu = {
  nama: string
  harga: number
  isAktif: boolean
  sortOrder: number
  categoryName: string
}

async function getSharedCategories(): Promise<SharedCategory[]> {
  const masterWarung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  if (!masterWarung) return []

  return prisma.menuCategory.findMany({
    where: { warungId: masterWarung.id },
    select: { nama: true, sortOrder: true, isAktif: true },
    orderBy: { sortOrder: 'asc' },
  })
}

async function getSharedMenus(): Promise<SharedMenu[]> {
  const masterWarung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  if (!masterWarung) return []

  return prisma.menu.findMany({
    where: { warungId: masterWarung.id },
    select: { nama: true, harga: true, isAktif: true, sortOrder: true, category: { select: { nama: true } } },
    orderBy: [{ sortOrder: 'asc' }, { nama: 'asc' }],
  }).then((menus) => menus.map((m) => ({
    nama: m.nama,
    harga: m.harga,
    isAktif: m.isAktif,
    sortOrder: m.sortOrder,
    categoryName: m.category.nama,
  })))
}

export async function syncWarungCategories(warungId: string) {
  const categories = await getSharedCategories()
  const existing = new Set(
    (await prisma.menuCategory.findMany({ where: { warungId }, select: { nama: true } })).map((c) => c.nama)
  )

  for (const cat of categories) {
    if (!existing.has(cat.nama)) {
      await prisma.menuCategory.create({
        data: { warungId, nama: cat.nama, sortOrder: cat.sortOrder, isAktif: cat.isAktif },
      })
    }
  }
}

export async function syncWarungMenus(warungId: string, overwrite = false) {
  await syncWarungCategories(warungId)

  const menus = await getSharedMenus()

  const categoriesInTarget = await prisma.menuCategory.findMany({
    where: { warungId },
    select: { id: true, nama: true },
  })
  const categoryMap = new Map(categoriesInTarget.map((c) => [c.nama, c.id]))

  const existingNames = overwrite
    ? new Set<string>()
    : new Set((await prisma.menu.findMany({ where: { warungId }, select: { nama: true } })).map((m) => m.nama))

  for (const menu of menus) {
    if (!overwrite && existingNames.has(menu.nama)) continue
    const categoryId = categoryMap.get(menu.categoryName)
    if (!categoryId) continue

    await prisma.menu.upsert({
      where: { warungId_nama: { warungId, nama: menu.nama } },
      update: overwrite
        ? { harga: menu.harga, isAktif: menu.isAktif, sortOrder: menu.sortOrder, categoryId }
        : {},
      create: {
        warungId,
        categoryId,
        nama: menu.nama,
        harga: menu.harga,
        isAktif: menu.isAktif,
        sortOrder: menu.sortOrder,
      },
    })
  }
}

export async function syncMenusAcrossWarungs() {
  const warungs = await prisma.warung.findMany({ select: { id: true } })
  await Promise.all(warungs.map((warung) => syncWarungMenus(warung.id, true)))
}

export async function getMasterWarungId() {
  const warung = await prisma.warung.findFirst({ orderBy: { kode: 'asc' }, select: { id: true } })
  return warung?.id ?? null
}
