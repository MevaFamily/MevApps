# 📱 MevApps (Home Super-App)

MevApps adalah sebuah ekosistem aplikasi keuangan dan manajemen rumah (Super-App) modern berbasis **Progressive Web App (PWA)**. Aplikasi ini dirancang dengan antarmuka yang sangat minimalis, modern (*clean design*), serta memprioritaskan arsitektur data *real-time* yang cepat dan responsif.

---

## 🚀 Fitur Utama

- **Autentikasi Supabase & Proteksi Rute**: Mengamankan data rumah tangga dengan **Supabase Auth**. Dilengkapi dengan halaman login modern, fitur "Ingat Saya" (*Remember Me*), ikon mata intip kata sandi, serta pengisian otomatis domain `@meva.com` (cukup ketik *username* Anda).
- **Pencatatan Keuangan Terintegrasi**: Mengelola *Pemasukan*, *Pengeluaran*, dan *Transfer* antar dompet/akun dengan antarmuka formulir yang elegan dan *smart auto-close*.
- **Rincian Transaksi Dinamis**:
  - Tampilan kartu riwayat menyandingkan Kategori & Sub-Kategori dalam baris yang sama (`Kategori • Sub-Kategori`).
  - Menampilkan catatan transaksi (*notes*) di bagian bawah kartu secara elegan.
  - Untuk transaksi tipe *Transfer*, secara otomatis mendeteksi dan menampilkan alur akun pengirim ke penerima (`Dompet Asal → Dompet Tujuan`).
  - Kartu ringkasan bulanan menyajikan info sisa anggaran (*Sisa budget*) atau kelebihan anggaran (*Over budget*) beserta persentasenya secara cerdas.
- **Kelompok Akun Kustom & Warna Indikator Saldo**: 
  - Akun keuangan dapat dikelompokkan berdasarkan nama kelompok kustom yang Anda buat sendiri (contoh: *Uang Ivan*, *Uang Melin*, *Tabungan Bersama*).
  - Total saldo per kelompok disorot dengan *pill badge* minimalis yang menonjol.
  - Nilai nominal saldo diwarnai secara otomatis (Hijau 🟢 untuk saldo positif, Merah 🔴 untuk saldo negatif/hutang).
  - Grafik garis (*Line Chart*) interaktif menampilkan tren kekayaan bersih (*Net Worth*) keluarga Anda selama 6 bulan terakhir.
- **Manajemen Anggaran (Budgeting) Hierarkis & Akordeon**: 
  - Tetapkan batas anggaran untuk Kategori utama atau rincikan lebih dalam pada level Sub-Kategori.
  - Tampilan kategori budget dapat ditutup-buka (*accordion*) dengan opsi kontrol global: **Buka Semua | Tutup Semua** untuk kebersihan layar.
- **Rangkuman Multi-Periode & Analitik (Drill-down)**: 
  - Menyediakan filter waktu dinamis: **Harian**, **Mingguan**, dan **Bulanan** dengan navigasi tanggal yang responsif.
  - Visualisasi proporsi pengeluaran dengan *Pie Chart* interaktif.
  - Satu ketukan pada Sub-Kategori di halaman Rangkuman akan mengarahkan Anda ke daftar Transaksi yang sudah terfilter secara presisi sesuai Periode dan Sub-Kategori yang bersangkutan.
- **PWA Ready**: Dapat diinstal sebagai aplikasi native di iOS, Android, maupun Desktop (Windows/Mac) langsung dari browser Anda.

---

## 🛠️ Arsitektur & Tech Stack

Aplikasi ini dibangun di atas pondasi arsitektur **Jamstack** modern:
- **Framework**: [Next.js 14+](https://nextjs.org/) (Menggunakan sistem *App Router*)
- **Frontend / UI**: React.js dengan [Tailwind CSS](https://tailwindcss.com/) (Desain token kustom dan utilitas modern)
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL-as-a-Service)
- **State Management & Realtime**: React Context API (`AppProvider`) dipadukan dengan *Supabase Realtime Channel Subscription* untuk sinkronisasi seketika antar perangkat.
- **Security / Routing Guard**: Komponen `AuthGuard` klien memvalidasi status autentikasi di tingkat *layout* induk.
- **Data Visualization**: [Recharts](https://recharts.org/) (Untuk visualisasi grafik pie dan grafik garis yang responsif)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PWA Module**: `next-pwa`

---

## 🗄️ Skema Database (Supabase PostgreSQL)

Aplikasi ini menggunakan 5 tabel utama yang saling berelasi dengan tipe data UUID:

1. **`accounts`** (Akun / Dompet Utama)
   - `id` (UUID, Primary Key)
   - `name` (String: Nama Akun, misal: "BCA", "Gopay")
   - `type` (String: Kelompok akun kustom, misal: "Uang Ivan", "Tabungan")
   - `balance` (Numeric: Saldo saat ini, otomatis terupdate via sinkronisasi klien)
   - `created_at` (Timestamp)

2. **`transactions`** (Data Arus Kas)
   - `id` (UUID, Primary Key)
   - `date` (String YYYY-MM-DD: Waktu transaksi)
   - `account_id` (UUID: Relasi ke `accounts`)
   - `account_name` (String: Snapshot nama akun asal)
   - `destination_account_id` (UUID: Relasi ke `accounts` untuk transfer akun tujuan)
   - `type` (String: `pemasukan` / `pengeluaran` / `transfer`)
   - `amount` (Numeric: Nominal)
   - `category` (String: Nama kategori induk)
   - `subcategory` (String: Nama sub-kategori)
   - `note` (String: Catatan opsional)
   - `created_at` (Timestamp)

3. **`categories`** (Kategori Transaksi)
   - `id` (UUID, Primary Key)
   - `name` (String: "Makanan", "Transportasi")
   - `type` (String: `pemasukan` / `pengeluaran`)

4. **`subcategories`** (Sub-Kategori)
   - `id` (UUID, Primary Key)
   - `category_id` (UUID: Foreign key ke `categories`)
   - `name` (String: "Makan Siang", "Bensin")

5. **`budgets`** (Pengaturan Batas Anggaran)
   - `id` (UUID, Primary Key)
   - `category` (UUID: Merujuk ke ID dari *Categories* ATAU *Subcategories*)
   - `amount_limit` (Numeric: Batas pengeluaran / budget limit)
   - `month` (String: Format YYYY-MM, menentukan periode aktif budget)

---

## 📂 Struktur Folder Aplikasi

```text
MevApps/
├── app/
│   ├── akun/           # Halaman Manajemen Akun & Tren Kekayaan
│   ├── anggaran/       # Halaman Setup Budget & Kategori Akordeon
│   ├── hub/            # Halaman Portal Utama & Tombol Logout
│   ├── login/          # Halaman Login Autocomplete Domain
│   ├── rangkuman/      # Halaman Analitik Harian/Mingguan/Bulanan
│   ├── transaksi/      # Halaman List & Riwayat Transaksi
│   ├── globals.css     # CSS Utama (Tailwind Setup)
│   ├── layout.js       # Layout PWA Inti & AuthGuard Wrapper
│   └── page.js         # Landing Page / Index Redirector
├── components/
│   ├── AppProvider.js  # Jantung Aplikasi (Context, Realtime, Global State)
│   ├── AuthGuard.js    # Proteksi Rute & Redireksi Otomatis Klien
│   ├── BottomNav.js    # Komponen Navigasi Bawah
│   └── TransactionForm.js # Form Modal (Tambah/Edit) Transaksi
├── lib/
│   └── supabase.js     # Inisialisasi Klien Database Supabase
├── public/
│   ├── manifest.json   # Konfigurasi PWA (Warna, Nama, Icon)
│   └── icons/          # Berisi Icon Aplikasi (192x192, 512x512)
├── .env.local          # Environment Variables (Supabase Keys) - Tidak masuk ke Github
├── next.config.mjs     # Konfigurasi Next.js & next-pwa
└── package.json        # Dependency & Scripts
```

---

## ⚙️ Sistem Aplikasi (Alur Logika)

1. **Autentikasi & Proteksi Rute**: Aplikasi memuat `AppProvider` untuk memeriksa sesi Supabase Auth. Jika status belum terautentikasi, `AuthGuard` membekukan halaman dan mengarahkan klien secara langsung ke halaman `/login`.
2. **Bootstraping & Data Hydration**: Begitu sesi pengguna terdeteksi valid, `AppProvider` melakukan fetch data pada seluruh tabel PostgreSQL Supabase secara paralel.
3. **Real-time Live Sync**: `AppProvider` memasang *listener* (`supabase.channel`). Jika Anda menambahkan transaksi di HP, layar laptop yang sedang membuka aplikasi yang sama akan langsung ter-update dalam hitungan milidetik secara asinkron.
4. **Smart Balances & Kelompok**: Transaksi baru secara dinamis memperbarui saldo dompet di tabel `accounts`. Saldo dipetakan dan dikelompokkan secara kustom dengan warna tanda positif/negatif.
5. **Hierarchical Budgets**: Kalkulasi budget menelusuri ke bawah (*drill-down*). Jika Kategori memiliki Sub-Kategori, perhitungan Budget atas dinonaktifkan dan ditarik langsung (di-sum) dari limit per sub-kategori. Ini menghindari duplikasi anggaran ganda.
6. **Timezone-Safe Filter**: Memiliki mekanisme pencarian tanggal (`YYYY-MM-DD`, rentang minggu, dan `YYYY-MM`) yang selaras antara halaman `Rangkuman` dan `Transaksi` dengan mitigasi offset UTC (+07:00).

---

## 💻 Cara Menjalankan Secara Lokal (Development)

1. Pastikan Node.js terinstall.
2. Clone repository dan jalankan instalasi paket:
   ```bash
   npm install
   ```
3. Buat file `.env.local` di *root directory* dan masukkan kunci rahasia Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
4. Mulai server *development*:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:3000` di *browser*.

*(Deploy otomatis ke internet menggunakan layanan Vercel lewat integrasi GitHub)*
