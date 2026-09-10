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

  // Seed menu untuk warung 1 sebagai contoh
  await prisma.menu.createMany({
    data: [
      // Makanan
      { warungId: warung1.id, nama: 'Nasi Uduk', kategori: 'MAKANAN', harga: 15000 },
      { warungId: warung1.id, nama: 'Nasi Putih', kategori: 'MAKANAN', harga: 5000 },
      { warungId: warung1.id, nama: 'Cumi Goreng', kategori: 'MAKANAN', harga: 35000 },
      { warungId: warung1.id, nama: 'Udang Goreng', kategori: 'MAKANAN', harga: 40000 },
      { warungId: warung1.id, nama: 'Ikan Bakar', kategori: 'MAKANAN', harga: 45000 },
      { warungId: warung1.id, nama: 'Kepiting Rebus', kategori: 'MAKANAN', harga: 75000 },
      { warungId: warung1.id, nama: 'Kerang Rebus', kategori: 'MAKANAN', harga: 30000 },
      { warungId: warung1.id, nama: 'Ayam Goreng', kategori: 'MAKANAN', harga: 25000 },
      { warungId: warung1.id, nama: 'Tempe Goreng', kategori: 'MAKANAN', harga: 8000 },
      { warungId: warung1.id, nama: 'Tahu Goreng', kategori: 'MAKANAN', harga: 8000 },
      // Minuman
      { warungId: warung1.id, nama: 'Es Teh Manis', kategori: 'MINUMAN', harga: 5000 },
      { warungId: warung1.id, nama: 'Es Jeruk', kategori: 'MINUMAN', harga: 8000 },
      { warungId: warung1.id, nama: 'Es Kelapa Muda', kategori: 'MINUMAN', harga: 15000 },
      { warungId: warung1.id, nama: 'Air Mineral', kategori: 'MINUMAN', harga: 5000 },
      { warungId: warung1.id, nama: 'Teh Hangat', kategori: 'MINUMAN', harga: 5000 },
      { warungId: warung1.id, nama: 'Jus Alpukat', kategori: 'MINUMAN', harga: 15000 },
    ],
  })

  // Seed menu untuk warung 2
  await prisma.menu.createMany({
    data: [
      { warungId: warung2.id, nama: 'Nasi Uduk', kategori: 'MAKANAN', harga: 15000 },
      { warungId: warung2.id, nama: 'Nasi Putih', kategori: 'MAKANAN', harga: 5000 },
      { warungId: warung2.id, nama: 'Cumi Goreng', kategori: 'MAKANAN', harga: 35000 },
      { warungId: warung2.id, nama: 'Udang Goreng', kategori: 'MAKANAN', harga: 40000 },
      { warungId: warung2.id, nama: 'Es Teh Manis', kategori: 'MINUMAN', harga: 5000 },
      { warungId: warung2.id, nama: 'Air Mineral', kategori: 'MINUMAN', harga: 5000 },
    ],
  })

  // Seed menu untuk warung 3
  await prisma.menu.createMany({
    data: [
      { warungId: warung3.id, nama: 'Nasi Uduk', kategori: 'MAKANAN', harga: 15000 },
      { warungId: warung3.id, nama: 'Nasi Putih', kategori: 'MAKANAN', harga: 5000 },
      { warungId: warung3.id, nama: 'Ikan Bakar', kategori: 'MAKANAN', harga: 45000 },
      { warungId: warung3.id, nama: 'Es Teh Manis', kategori: 'MINUMAN', harga: 5000 },
      { warungId: warung3.id, nama: 'Air Mineral', kategori: 'MINUMAN', harga: 5000 },
    ],
  })

  console.log('✅ Menu di-seed untuk semua warung')
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
