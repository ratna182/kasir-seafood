Buatkan file design.md di root repo ini — dokumen design system yang jadi
rujukan untuk seluruh UI aplikasi kasir ini, termasuk fitur "order sementara
per meja" yang baru saja dirancang. Ini BUKAN task untuk langsung mengubah
UI — hasilnya adalah dokumen spesifikasi yang akan saya review dulu sebelum
diimplementasikan ke komponen.

KONTEKS SUBJECT MATTER (dasar semua keputusan visual):
Ini kasir untuk warung Seafood & Nasi Uduk, dipakai di HP/tablet oleh kasir
di lingkungan warung yang sibuk — tangan mungkin basah/kotor, pencahayaan
warung biasa (bukan studio-lit), transaksi harus cepat, dan outputnya
struk thermal 80mm. Brief-nya: buat terasa PREMIUM & CLASSY — setara
sistem kasir seharga ribuan euro (referensi dunia nyata: Toast POS,
Lightspeed Restaurant, SumUp Solo, sistem kasir di retail butik kelas atas
seperti Aesop) — TAPI tetap utilitarian dan cepat dipakai, bukan jadi
lambat/dekoratif.

Premium di kelas produk ini datang dari presisi & disiplin, bukan dari
dekorasi:
- Presisi tipografi (type scale yang jelas, weight yang disengaja)
- Spacing yang konsisten dan generous tapi disiplin, bukan longgar random
- Feedback state yang jelas dan cepat (item ditambahkan, meja terisi,
  pembayaran berhasil) — motion yang menjawab aksi kasir, bukan hiasan
- Material/texture yang terasa "solid" — bukan flat generic, tapi juga
  bukan skeuomorphic berlebihan

ASET VISUAL YANG SUDAH ADA — WAJIB DIPAKAI DI HALAMAN LOGIN:
Ada file cover-seafood.webp (saya lampirkan terpisah, taruh di /public dan
referensikan di design.md) — ilustrasi gaya naturalist/vintage woodcut:
udang, kepiting, cumi, kerang, ikan, ayam, bebek digambar detail warna
penuh, logo lingkaran "VIAN JAYA 08" dengan bintang di tengah, teks
"SEAFOOD" dan "NASI UDUK" pakai serif condensed tebal warna merah, semua
di atas background putih polos. Ini identitas brand yang SUDAH ADA, bukan
placeholder — jangan didesain ulang, cukup ditata ulang komposisinya.

Gunakan aset ini sebagai cover/hero halaman login. Yang perlu didefinisikan
di design.md:
- Layout split-screen untuk login: satu panel menampilkan ilustrasi ini
  sebagai hero, panel lain berisi form login (username + password kasir).
  Di mobile/tablet sempit, hero bisa jadi header di atas form (bukan
  dihilangkan).
- Background putih polos di file asli JANGAN dibiarkan mentah bersanding
  dengan form di atas kanvas putih yang sama — itu yang membuat terlihat
  seperti aset ditempel asal, bukan didesain. Beri panel/backdrop
  (misalnya warna gelap kaya atau warna dasar dari token palette) di
  belakang ilustrasi supaya ilustrasi "duduk" di dalam komposisi, bukan
  mengambang di atas putih.
- Warna merah pada logo & teks ilustrasi ini adalah bagian dari identitas
  brand yang sudah given — pertimbangkan menjadikannya acuan warna aksen
  primer di token color (poin 1 di bawah), bukan memilih aksen baru yang
  malah bertabrakan dengan brand mark yang sudah ada.
- Tentukan juga bagaimana logo lingkaran ini dipakai di tempat lain
  (misal header aplikasi setelah login, watermark di struk) supaya
  konsisten, bukan cuma dipakai sekali di halaman login lalu hilang.

HAL YANG WAJIB DIHINDARI (default AI-generated yang paling gampang kejadian):
- Background krem hangat (~#F4F1EA) dipasangkan sama aksen terracotta/clay
  (~#D97757) — kombinasi paling umum dan gampang ketebak sebagai AI-made
- "SaaS card kit": semua konten dipotong jadi card seragam, border-radius
  sama di semua elemen tanpa mempertimbangkan hierarki, soft grey shadow
  yang sama di tiap card, gradient sebagai dekorasi kosong
- Label ALL-CAPS dengan letter-spacing lebar di atas setiap heading
  ("eyeing label")
- Meta text yang disambung titik tengah (·) atau em dash panjang
  ("WORD — fragment")
- Angka urut (01/02/03) dipakai sebagai dekorasi padahal kontennya bukan
  sequence/proses berurutan
- Tanda panah (→) ditempel di akhir teks tombol/link secara default
- Aksen tunggal pada satu kata di headline (italic/bold/warna beda)
- Font monospace untuk label data kecil tanpa alasan fungsional
- Fade-and-slide-up animation di setiap section/card saat load — kalau
  ada motion, harus merespons aksi user (tap, konfirmasi, submit), bukan
  hiasan otomatis

DELIVERABLE — struktur design.md:

1. Color — 4-6 hex value dengan nama & peran masing-masing (base,
   surface, teks, aksen primer, status sukses/gagal untuk konteks kasir
   seperti "pembayaran berhasil" vs "meja masih OPEN"). Jangan pakai
   kombinasi krem+terracotta di atas.

2. Typography — pilih 1-2 typeface (kalau 2, harus jelas beda perannya:
   display vs body/data), definisikan type scale dengan weight yang
   spesifik. Pertimbangkan bahwa angka (harga, quantity, nomor meja)
   akan sering dibaca cepat sambil bertransaksi — perlu tabular figures
   / numeric alignment yang rapi.

3. Layout & Komponen kunci — jelaskan prinsip layout untuk:
   - Halaman login (pakai cover-seafood.webp sebagai hero — lihat detail
     komposisi di bagian "ASET VISUAL" di atas)
   - Halaman input pesanan (pemilihan menu + qty)
   - List "Meja Aktif" (status OPEN per meja)
   - Detail order per meja (item terkumpul, bisa edit/hapus)
   - Flow pembayaran (pilih cash/QRIS, konfirmasi)
   - Preview/print struk thermal 80mm
   Sertakan ASCII wireframe kasar untuk masing-masing kalau membantu.
   Tentukan alignment (rata kiri/tengah), dan bagaimana touch target
   diperbesar untuk penggunaan cepat di tablet/HP.

4. Motion — daftar interaksi mana saja yang layak dapat motion (contoh:
   konfirmasi item ditambahkan ke order, transisi status meja OPEN→PAID)
   dan bagaimana bentuknya (durasi, easing, apa yang berubah).

5. Voice/copy — bahasa UI dalam Bahasa Indonesia, sudut pandang kasir
   (bukan istilah teknis sistem). Tombol pakai kata kerja aktif dan
   konsisten dengan hasil aksinya (misal tombol "Cetak Struk" →
   notifikasi "Struk dicetak", bukan "Print" → "Success").

6. Quality floor — checklist non-negotiable: kontras warna accessible,
   focus state keyboard terlihat, responsive dari HP kecil sampai
   tablet, touch target minimal 44px untuk elemen interaktif di
   halaman kasir.

PROSES:
Sebelum menulis design.md final, tulis dulu rencana singkat (color/type/
layout/principles) dan review sendiri: apakah pilihan ini benar-benar
spesifik untuk konteks warung seafood & workflow kasir cepat, atau cuma
default generik yang bisa dipasang ke aplikasi POS apapun? Revisi bagian
yang masih generik sebelum menuliskan versi final. Cek juga UI yang sudah
ada di src/ sekarang (kalau ada) supaya design.md ini realistis untuk
diterapkan bertahap, bukan rombak total dari nol.
