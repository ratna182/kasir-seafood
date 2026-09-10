import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hapus data lama (urutan penting karena foreign key)
  await prisma.kasirSesi.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.menu.deleteMany()
  await prisma.user.deleteMany()
  await prisma.warung.deleteMany()

  // Buat 3 warung
  const warung1 = await prisma.warung.create({
    data: { nama: 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 1', kode: 'VJ08-1' },
  })
  const warung2 = await prisma.warung.create({
    data: { nama: 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 2', kode: 'VJ08-2' },
  })
  const warung3 = await prisma.warung.create({
    data: { nama: 'Seafood & Nasi Uduk Vian Jaya 08 - Cabang 3', kode: 'VJ08-3' },
  })

  console.log('✅ 3 warung dibuat')

  // Buat akun owner (tanpa warung spesifik, bisa akses semua)
  const ownerPasswordHash = await bcrypt.hash('owner123', 8)
  const owner = await prisma.user.create({
    data: {
      username: 'owner',
      passwordHash: ownerPasswordHash,
      namaLengkap: 'Owner Vian Jaya 08',
      role: 'OWNER',
    },
  })

  console.log('✅ Akun owner dibuat (username=owner, password=owner123)')

  // Buat 3 akun kasir (1 per warung)
  const kasirPasswordHash = await bcrypt.hash('kasir123', 8)

  await prisma.user.createMany({
    data: [
      {
        warungId: warung1.id,
        username: 'kasir1',
        passwordHash: kasirPasswordHash,
        namaLengkap: 'Kasir Cabang 1',
        role: 'KASIR',
      },
      {
        warungId: warung2.id,
        username: 'kasir2',
        passwordHash: kasirPasswordHash,
        namaLengkap: 'Kasir Cabang 2',
        role: 'KASIR',
      },
      {
        warungId: warung3.id,
        username: 'kasir3',
        passwordHash: kasirPasswordHash,
        namaLengkap: 'Kasir Cabang 3',
        role: 'KASIR',
      },
    ],
  })

  console.log('✅ 3 akun kasir dibuat (password: kasir123)')

  // Menu lengkap — sama untuk semua warung
  const menuData = [
    // Makanan
    { nama: 'Nasi Uduk', kategori: 'MAKANAN' as const, harga: 15000 },
    { nama: 'Nasi Putih', kategori: 'MAKANAN' as const, harga: 5000 },
    { nama: 'Cumi Goreng', kategori: 'MAKANAN' as const, harga: 35000 },
    { nama: 'Udang Goreng', kategori: 'MAKANAN' as const, harga: 40000 },
    { nama: 'Ikan Bakar', kategori: 'MAKANAN' as const, harga: 45000 },
    { nama: 'Kepiting Rebus', kategori: 'MAKANAN' as const, harga: 75000 },
    { nama: 'Kerang Rebus', kategori: 'MAKANAN' as const, harga: 30000 },
    { nama: 'Ayam Goreng', kategori: 'MAKANAN' as const, harga: 25000 },
    { nama: 'Tempe Goreng', kategori: 'MAKANAN' as const, harga: 8000 },
    { nama: 'Tahu Goreng', kategori: 'MAKANAN' as const, harga: 8000 },
    // Minuman
    { nama: 'Es Teh Manis', kategori: 'MINUMAN' as const, harga: 5000 },
    { nama: 'Es Jeruk', kategori: 'MINUMAN' as const, harga: 8000 },
    { nama: 'Es Kelapa Muda', kategori: 'MINUMAN' as const, harga: 15000 },
    { nama: 'Air Mineral', kategori: 'MINUMAN' as const, harga: 5000 },
    { nama: 'Teh Hangat', kategori: 'MINUMAN' as const, harga: 5000 },
    { nama: 'Jus Alpukat', kategori: 'MINUMAN' as const, harga: 15000 },
  ]

  // Seed menu yang sama untuk semua warung
  for (const warung of [warung1, warung2, warung3]) {
    await prisma.menu.createMany({
      data: menuData.map((m) => ({
        warungId: warung.id,
        nama: m.nama,
        kategori: m.kategori,
        harga: m.harga,
        isAktif: true,
      })),
    })
  }

  console.log('✅ Menu yang sama di-seed untuk semua 3 warung')
  console.log('')
  console.log('📋 Akun login:')
  console.log('  Owner:    username=owner    password=owner123')
  console.log('  Warung 1: username=kasir1   password=kasir123')
  console.log('  Warung 2: username=kasir2   password=kasir123')
  console.log('  Warung 3: username=kasir3   password=kasir123')
  console.log('')
  console.log('🎉 Seeding selesai!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
