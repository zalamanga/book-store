# BUKA BUKU

Alur halaman, sumber data katalog dan berkas yang perlu diubah dijelaskan di [CODE_FLOW](docs/CODE_FLOW.md).

Katalog statis berisi sembilan buku, dibuat dengan HTML dan CSS. Setiap buku memiliki sampul, judul, penulis, tanggal rilis, dan sinopsis.

Seluruh isi katalog tersimpan langsung di `index.html`. Proyek ini belum memiliki pencarian, akun pengguna, keranjang, pembayaran, atau backend. Halaman situs tidak memakai JavaScript atau database dan dapat dibuka tanpa memasang dependensi.

## Jalankan di komputer

Siapkan Git dan Python 3, lalu jalankan dari terminal:

```powershell
git clone https://github.com/zalamanga/book-store.git
cd book-store
python -m http.server 18091 --bind 127.0.0.1
```

Buka [http://127.0.0.1:18091](http://127.0.0.1:18091). Biarkan terminal tetap terbuka selama memakai situs; tekan `Ctrl+C` untuk menghentikan server.

Alternatif tanpa server: buka `index.html` langsung di browser. Gambar dan stylesheet memakai jalur relatif. Python hanya menyediakan server lokal; situsnya sendiri tidak menjalankan kode Python.

## Isi situs

- Navigasi menuju halaman awal, bagian tentang BUKA BUKU, dan katalog.
- Sembilan kartu buku dengan informasi dan sinopsis dari data proyek.
- Tiga belas gambar lokal untuk sampul, logo, ilustrasi, dan latar.

Informasi buku tersimpan pada proyek dan tidak tersinkronisasi dengan layanan penerbit.

## Jalankan dengan Docker

Docker merupakan alternatif server Python. Siapkan Docker Desktop dengan Docker Compose, lalu jalankan dari folder repo:

```powershell
docker compose up -d --build
```

Buka alamat yang sama, [http://127.0.0.1:18091](http://127.0.0.1:18091). Pilih satu cara menjalankan pada satu waktu agar port tidak berbenturan. Hentikan container setelah selesai:

```powershell
docker compose down
```

## Struktur folder

```text
book-store/
├── index.html        # Isi halaman dan daftar buku
├── style.css         # Tata letak dan tampilan
├── image/            # 13 gambar lokal
├── Dockerfile        # Pembuatan image server statis
├── compose.yaml      # Menjalankan server dengan Docker
├── package.json      # Perintah pengujian browser
└── tests/            # Pengujian proyek
```

Browser hanya memerlukan HTML, CSS, dan gambar.

## Mengubah katalog

1. Buka `index.html`, lalu temukan judul buku yang ingin diubah. Perbarui judul, penulis, tanggal, dan sinopsis pada kartu yang sama.
2. Simpan gambar sampul di `image/`, lalu sesuaikan nilai `src` dan teks `alt` pada gambar kartu tersebut.
3. Gunakan `style.css` untuk mengubah warna, jarak, atau susunan halaman. Muat ulang browser setelah menyimpan file.

Untuk menambahkan buku, salin satu elemen `<article class="books_card">` di dalam `.books_box`. Ganti isi kartu, lalu gunakan ID judul yang unik, misalnya `book-10-title`, pada `<h3 id="book-10-title">` dan `aria-labelledby="book-10-title"` pada artikel. Sesuaikan keterangan jumlah buku di halaman, README, dan ekspektasi jumlah buku pada `tests/browser.spec.js`.

Pertahankan ID tujuan navigasi `home`, `about`, dan `book`. Cocokkan nama gambar, huruf besar/kecil, dan ekstensi `.jpg`, `.jpeg`, atau `.png` agar aset terbaca saat dihosting.

## Menjalankan pengujian

Pengujian memerlukan Node.js 20 atau lebih baru, npm, Python 3.9 atau lebih baru, dan browser Chrome yang sudah terpasang di Windows. Node.js dan npm hanya digunakan untuk pengujian:

```powershell
npm ci
npm test
```

Tes memeriksa gambar, navigasi, akses keyboard, sinopsis, dan tata letak pada lebar 320, 390, serta 768 piksel. Server Python lokal dijalankan otomatis saat tes dimulai. Untuk memeriksa server Docker yang sudah aktif, gunakan:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:18091"
npm test
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Jika memakai Microsoft Edge, atur `$env:PLAYWRIGHT_CHANNEL = "msedge"` sebelum menjalankan tes.

Pada Linux atau macOS, pasang browser uji dengan `npx playwright install chromium` setelah `npm ci`, lalu jalankan `npm test`.

## Jika situs belum terbuka

| Masalah | Langkah yang bisa dicoba |
|---|---|
| `python` tidak dikenali | Gunakan `py -m http.server 18091 --bind 127.0.0.1` jika Python Launcher tersedia, atau buka `index.html` langsung. |
| Port 18091 sedang dipakai | Hentikan server Python dengan `Ctrl+C` atau container dengan `docker compose down`. Untuk Python, ganti angka port menjadi `18092`. Untuk Docker di PowerShell, atur `$env:APP_PORT = "18092"` sebelum menjalankan Compose. Buka port baru pada browser. |
| Gambar tidak muncul | Periksa lokasi `image/`, nilai `src`, ekstensi, dan huruf besar/kecil. Jangan pindahkan `index.html` sendirian tanpa CSS dan folder gambarnya. |

## Asal sumber dan aset

Versi ini memakai sumber katalog yang lebih lengkap, dengan seluruh sampul tersedia. Salinan lama memiliki enam rujukan sampul yang belum terisi dan tidak menjadi isi repo ini.

Sumber awal tidak menyertakan berkas lisensi. Sampul dan materi buku merujuk karya pihak lain; repo ini tidak memberikan lisensi menyeluruh atas aset tersebut. Asal pembuat template belum tercatat pada sumber awal.
