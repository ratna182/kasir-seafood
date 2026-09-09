# Kasir Seafood & Nasi Uduk “Vian Jaya 08” 🐟🍚

Aplikasi POS (Point of Sales) multi-outlet untuk 3 cabang warung makan **Seafood & Nasi Uduk Vian Jaya 08**. Dibuat dengan Next.js 16 (App Router), TypeScript, Prisma ORM, dan PostgreSQL.

---

## 🌟 Fitur Utama

1. **Multi-Tenant (3 Warung dalam 1 Aplikasi)**
   - Warung 1, Warung 2, dan Warung 3 memiliki data terpisah (menu, transaksi, riwayat, dan laporan).
   - Login sederhana per warung dengan akun kasir masing-masing.

2. **Kelola Menu**
   - Tambah menu baru (Makanan / Minuman).
   - Edit nama & harga satuan.
   - Aktifkan/nonaktifkan menu.

3. **Transaksi & Kasir**
   - Pilih nomor meja tamu.
   - Pilih menu makanan & minuman dengan penyesuaian kuantiti (+ / -).
   - Kalkulasi otomatis subtotal & total bayar.
   - Validasi tutup kasir (tidak bisa input transaksi baru setelah kasir ditutup).

4. **Cetak Struk Thermal 80mm**
   - Format struk thermal standar lebar 80mm.
   - Tombol "Cetak Struk" langsung memicu dialog cetak browser (`window.print()`).
   - CSS `@media print` rapi untuk printer kasir thermal USB/Bluetooth.

5. **Riwayat Transaksi**
   - Daftar transaksi hari ini dan filter tanggal sebelumnya.
   - Cetak ulang struk transaksi kapan saja.

6. **Laporan Harian & Tutup Kasir**
   - Ringkasan total transaksi dan omset harian.
   - Rekap menu terjual per kategori dan kuantiti.
   - Tombol **Tutup Kasir** permanen per hari.
   - Cetak laporan tutup kasir format 80mm untuk disetor ke pemilik.

---

## 🔐 Akun Default (Seed Data)

| Warung / Cabang | Username | Password Default |
| :--- | :--- | :--- |
| **Cabang 1 (Utama)** | `warung1` | `warung01` |
| **Cabang 2** | `warung2` | `warung02` |
| **Cabang 3** | `warung3` | `warung03` |

---

## ⚙️ Persiapan & Menjalankan Lokal

### 1. Konfigurasi Database PostgreSQL
Edit file `.env` dan masukkan connection string database PostgreSQL Anda:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/kasir_vian_jaya?schema=public"
SESSION_SECRET="kunci-rahasia-minimal-32-karakter-acak"
```

### 2. Push Schema & Seed Data
Jalankan perintah berikut untuk membuat tabel dan mengisi akun awal serta menu contoh:
```bash
npx prisma db push
npm run seed  # atau: npx tsx prisma/seed.ts
```

### 3. Jalankan Aplikasi
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🚀 Panduan Deploy ke Railway

1. Buat project baru di [Railway.app](https://railway.app).
2. Tambahkan database **PostgreSQL** di Railway.
3. Hubungkan repository GitHub ini ke Railway.
4. Di tab **Variables** service aplikasi Anda di Railway, tambahkan:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (atau connection string PostgreSQL dari Railway).
   - `SESSION_SECRET`: string acak minimal 32 karakter.
5. Jalankan `prisma db push` dan seed sekali saat inisialisasi awal database di Railway.

