# Design System - Kasir Vian Jaya 08

Dokumen ini adalah rujukan visual untuk UI aplikasi kasir Seafood & Nasi Uduk Vian Jaya 08. Targetnya premium karena presisi, bukan dekorasi: cepat dipakai kasir, jelas di tablet/HP, dan konsisten sampai struk thermal 80mm.

Asset brand utama: `/cover-seafood.webp`. Pakai di halaman login sebagai hero, bukan placeholder. Jangan redesign ilustrasi/logo di dalam asset.

## 1. Color

| Token | Hex | Peran |
|---|---:|---|
| `--color-bg` | `#07111F` | Base app gelap, mengurangi silau di warung dan membuat asset putih lebih intentional. |
| `--color-surface` | `#101B2B` | Panel utama, navbar, form, order summary. |
| `--color-surface-raised` | `#17263A` | Komponen aktif: meja dipilih, item tersimpan, modal pembayaran. |
| `--color-text` | `#F7FAFC` | Teks utama di background gelap. |
| `--color-text-muted` | `#A6B3C4` | Helper text, metadata transaksi, label sekunder. |
| `--color-brand-red` | `#B91C1C` | Aksen primer dari warna merah logo/teks `cover-seafood.webp`. Pakai untuk CTA utama dan brand emphasis. |
| `--color-open` | `#F59E0B` | Status meja masih OPEN/order sementara. |
| `--color-paid` | `#16A34A` | Pembayaran berhasil/order final. |
| `--color-danger` | `#DC2626` | Hapus item, validasi gagal, aksi destruktif. |

Prinsip:
- Jangan pakai kombinasi krem hangat + terracotta sebagai tema utama.
- Brand red harus dominan sebagai identitas, bukan orange generik.
- Status harus berbeda jelas: OPEN amber, PAID green, error red.
- Surface gelap boleh punya subtle border `rgba(255,255,255,0.08)`, tapi jangan semua card punya shadow sama.

## 2. Typography

Typeface existing tetap dipakai supaya implementasi bertahap murah:

| Peran | Typeface | Catatan |
|---|---|---|
| Display/UI heading | `Outfit` | Untuk judul halaman, total pembayaran besar, nomor meja aktif. |
| Body/control | `Inter` | Untuk form, menu, table, tombol, copy status. |

Scale:

| Token | Size/Line | Weight | Peran |
|---|---:|---:|---|
| `display-lg` | 32/38 | 800 | Login headline, total final besar. |
| `title-lg` | 24/30 | 750 | Judul halaman transaksi/laporan. |
| `title-md` | 20/26 | 700 | Card header: Pesanan, Meja Aktif. |
| `body` | 16/24 | 400 | Copy normal dan isi form. |
| `body-strong` | 16/24 | 650 | Nama menu, nomor meja, label penting. |
| `control` | 15/20 | 700 | Tombol utama dan quick table chip. |
| `caption` | 13/18 | 500 | Metadata transaksi, helper, waktu OPEN. |
| `receipt` | 11/14 | 400/700 | Struk thermal, pakai `Courier New` untuk printer. |

Angka harga, qty, dan total harus pakai `font-variant-numeric: tabular-nums;` agar alignment stabil. Hindari monospace untuk metadata UI biasa; monospace hanya untuk struk atau ID transaksi.

## 3. Layout & Komponen Kunci

### Login

Split-screen desktop/tablet lebar. Hero kiri memakai `/cover-seafood.webp`, form kanan. Di mobile, hero menjadi header compact di atas form.

Ilustrasi harus duduk di panel/backdrop gelap, bukan ditempel di background putih mentah. Karena asset punya background putih, bungkus dengan frame putih tipis di atas panel navy/red gelap agar terlihat seperti brand plaque.

Wireframe desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────┐ ┌──────────────────────────┐ │
│ │ deep navy brand panel    │ │ Masuk ke Kasir           │ │
│ │ ┌──────────────────────┐ │ │ Username                 │ │
│ │ │ cover-seafood.webp   │ │ │ Password                 │ │
│ │ └──────────────────────┘ │ │ [Masuk]                  │ │
│ │ Vian Jaya 08            │ │ Bantuan: pilih akun outlet│ │
│ └──────────────────────────┘ └──────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌────────────────────┐
│ brand panel compact │
│ cover image         │
├────────────────────┤
│ Masuk ke Kasir      │
│ Username            │
│ Password            │
│ [Masuk]             │
└────────────────────┘
```

Rules:
- Form rata kiri, bukan center semua.
- Tombol `Masuk` minimal 48px tinggi.
- Error login muncul dekat form, Bahasa Indonesia, tanpa stack/error teknis.

### Halaman Input Pesanan

Layout existing dua kolom dipertahankan:
- Kiri: pencarian menu + filter kategori + grid menu.
- Kanan: nomor meja, order tersimpan, tambahan baru, total, aksi.

Prioritas: kasir bisa tambah item dengan satu tap. Menu card besar, nama dan harga cepat terbaca.

Wireframe:

```text
┌────────────────────────────────────────────────────────────┐
│ Meja Aktif: [Meja 2 OPEN] [Meja 5 OPEN] [Bungkus OPEN]     │
├──────────────────────────────┬─────────────────────────────┤
│ Cari menu                    │ Pesanan                     │
│ [Semua] [Makanan] [Minuman]  │ Nomor Meja [Meja 5]         │
│ ┌Menu┐ ┌Menu┐ ┌Menu┐         │ Order tersimpan             │
│ │+   │ │+   │ │+   │         │ Item lama [-] 2 [+] [Hapus] │
│ └────┘ └────┘ └────┘         │ Tambahan baru               │
│                              │ [Simpan Order Sementara]    │
│                              │ Total Order                 │
│                              │ [CASH] [QRIS]               │
│                              │ [Bayar & Cetak Struk]       │
└──────────────────────────────┴─────────────────────────────┘
```

Rules:
- Rata kiri untuk menu dan detail order.
- Total pembayaran boleh kanan karena angka perlu scanning cepat.
- Touch target menu card minimal 96px tinggi; tombol qty/hapus minimal 44px.
- Jika ada tambahan belum disimpan, tombol bayar disabled dengan pesan jelas: `Simpan tambahan item dulu sebelum bayar.`

### List Meja Aktif

Meja aktif bukan card dekoratif besar. Pakai chip/status tile compact agar banyak meja muat di tablet.

Isi minimal:
- Nomor meja.
- Jumlah item.
- Subtotal running.
- Lama OPEN.

State:
- OPEN: border/indicator amber.
- Selected: background surface raised + outline brand red.
- Empty: teks pendek `Belum ada order sementara.`

### Detail Order Per Meja

Detail harus memisahkan:
- `Order tersimpan`: item yang sudah masuk database.
- `Tambahan baru`: cart lokal yang belum disimpan.

Ini mencegah kasir mengira item belum tersimpan sudah ikut struk. Edit/hapus hanya untuk item `OPEN`; setelah bayar, item tidak bisa diedit.

### Flow Pembayaran

Metode bayar hanya `Cash` dan `QRIS` untuk MVP.

Urutan UI:
1. Pilih meja aktif.
2. Pastikan tidak ada tambahan belum disimpan.
3. Pilih `Cash` atau `QRIS`.
4. Tekan `Bayar & Cetak Struk`.
5. Server ubah status ke `SELESAI`, set metode bayar dan `printedAt`.
6. Modal struk muncul, kasir tekan `Cetak Struk`.

Copy tombol harus sesuai aksi:
- `Simpan Order Sementara`
- `Bayar & Cetak Struk`
- `Cetak Struk`
- `Pesanan Baru`

### Preview/Print Struk Thermal 80mm

Print tetap pakai mekanisme existing: `window.print()` dan CSS `@media print`.

Rules struk:
- Lebar 80mm.
- Header: nama warung, kode cabang.
- Metadata: nomor transaksi, meja, tanggal/jam, kasir, metode bayar.
- Item: nama, qty x harga, subtotal.
- Total bold jelas.
- Tidak ada background gelap, shadow, emoji, atau warna non-printer.
- Logo/brand dari asset boleh jadi watermark kecil hanya jika hasil print tetap tajam. Untuk MVP, teks brand lebih aman.

## 4. Motion

Motion hanya merespons aksi user, bukan animasi load otomatis semua card.

| Interaksi | Motion | Durasi/Easing |
|---|---|---|
| Item ditambahkan | Menu card pulse border brand red, qty badge naik 1 angka. | 120ms ease-out |
| Save order sementara | Tombol masuk loading, lalu panel order flash amber lembut. | 160ms ease-out |
| Pilih meja aktif | Selected outline bergerak/berubah opacity. | 120ms ease-out |
| Hapus item | Row collapse/fade cepat setelah server sukses. | 120ms ease-in |
| OPEN ke PAID | Status chip amber berubah green, lalu modal struk muncul. | 180ms ease-out |
| Error validasi | Field border danger + message muncul tanpa layout shift besar. | 120ms ease-out |

Tidak pakai fade-and-slide-up saat page load.

## 5. Voice/Copy

Bahasa UI: Bahasa Indonesia dari sudut pandang kasir. Hindari istilah teknis seperti `draft`, `mutation`, `success`, `payload`.

Prinsip copy:
- Tombol selalu kata kerja aktif.
- Pesan hasil menyebut akibat nyata.
- Error memberi langkah berikutnya.

Contoh:

| Kondisi | Copy |
|---|---|
| Save berhasil | `Order sementara tersimpan. Cetak struk dilakukan saat pembayaran final.` |
| Meja sudah OPEN | `Meja ini sudah ada order aktif. Refresh dan lanjutkan order yang sudah ada.` |
| Tambahan belum disimpan | `Simpan tambahan item dulu sebelum bayar.` |
| Bayar berhasil | `Pembayaran tercatat. Struk siap dicetak.` |
| Kasir tutup | `Kasir sudah ditutup. Transaksi baru dapat dibuat mulai besok.` |
| Menu tidak valid | `Beberapa menu tidak valid atau sudah tidak aktif.` |

Hindari:
- `Success`
- `Failed`
- `Order processed`
- Teks tombol campur bahasa seperti `Print Struk`.

## 6. Quality Floor

Checklist non-negotiable:

- Kontras teks normal minimal WCAG AA.
- Focus state keyboard terlihat di tombol, input, link, chip meja.
- Touch target halaman kasir minimal 44px.
- Tombol utama minimal 48px tinggi.
- Layout aman dari HP kecil sampai tablet landscape.
- Jangan menyembunyikan hero login di mobile; ubah jadi header compact.
- Angka harga/qty/total pakai tabular numeric alignment.
- Semua aksi mutasi punya loading/disabled state.
- Error API tampil sebagai Bahasa Indonesia yang bisa langsung dipahami kasir.
- Item order final tidak bisa diedit dari UI.
- Struk print tidak memakai warna/background yang mengganggu thermal printer.
- Asset `/cover-seafood.webp` hanya dipakai dari `/public`, tidak di-hardcode ke path lokal.

## Self-Review

Pilihan ini spesifik untuk konteks warung seafood dan workflow kasir karena:
- Asset brand existing menjadi pusat login, bukan dekorasi generik.
- Status OPEN/PAID memakai warna operasional yang cepat dibaca.
- Layout memisahkan order tersimpan dan tambahan baru agar cocok dengan held order per meja.
- Touch target dan copy diarahkan untuk kasir di HP/tablet saat kondisi warung sibuk.

Yang sengaja tidak dibuat:
- Tidak ada design token lengkap ratusan varian.
- Tidak ada motion dekoratif per section.
- Tidak ada redesign logo/ilustrasi.
- Tidak ada komponen baru di kode sampai dokumen ini direview.
