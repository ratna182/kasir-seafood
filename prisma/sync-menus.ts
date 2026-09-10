import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Syncing menus across all warungs...')

  const warungs = await prisma.warung.findMany({ orderBy: { kode: 'asc' } })
  if (warungs.length === 0) {
    console.log('❌ Tidak ada warung ditemukan.')
    return
  }

  // Ambil menu dari warung pertama sebagai source
  const sourceWarung = warungs[0]
  const sourceMenus = await prisma.menu.findMany({
    where: { warungId: sourceWarung.id },
    orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
  })

  if (sourceMenus.length === 0) {
    console.log(`❌ Tidak ada menu di warung ${sourceWarung.nama}. Buat menu dulu di warung ini.`)
    return
  }

  console.log(`📋 Source: ${sourceWarung.nama} (${sourceMenus.length} menu)`)

  // Untuk setiap warung lain, hapus semua menu lama, lalu copy dari source
  for (const warung of warungs) {
    if (warung.id === sourceWarung.id) continue

    // Hapus semua menu di warung ini
    await prisma.menu.deleteMany({ where: { warungId: warung.id } })

    // Copy semua menu dari source
    await prisma.menu.createMany({
      data: sourceMenus.map((m) => ({
        warungId: warung.id,
        nama: m.nama,
        kategori: m.kategori,
        harga: m.harga,
        isAktif: m.isAktif,
      })),
    })

    console.log(`✅ ${warung.nama} — ${sourceMenus.length} menu disalin`)
  }

  console.log('')
  console.log(`🎉 Semua ${warungs.length} warung sekarang punya menu yang sama:`)
  sourceMenus.forEach((m) => {
    console.log(`   ${m.kategori === 'MAKANAN' ? '🍽️' : '🥤'} ${m.nama} — Rp ${m.harga.toLocaleString('id-ID')}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
