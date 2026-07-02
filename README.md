# 📱 MevApps (Home Super-App)

MevApps adalah sebuah ekosistem aplikasi keuangan dan manajemen rumah (Super-App) modern berbasis **Progressive Web App (PWA)**. Aplikasi ini dirancang dengan antarmuka yang sangat minimalis, modern (*clean design*), serta memprioritaskan arsitektur data *real-time* yang cepat dan responsif.

## 🚀 Fitur Utama

- **Pencatatan Keuangan Terintegrasi**: Mengelola *Pemasukan*, *Pengeluaran*, dan *Transfer* antar dompet/akun dengan antarmuka formulir yang elegan dan *smart auto-close*.
- **Manajemen Anggaran (Budgeting) Hierarkis**: Tetapkan batas anggaran untuk Kategori utama atau rincikan lebih dalam pada level Sub-Kategori. Sistem akan otomatis mengakumulasi limit Kategori berdasarkan Sub-Kategori di dalamnya.
- **Rangkuman & Analitik (Drill-down)**: Visualisasi proporsi pengeluaran dengan *Pie Chart* interaktif. Dilengkapi bilah progres (Progress Bar) yang memberi indikator warna cerdas jika budget melebihi kapasitas (hingga >100%).
- **Filter Dinamis Lintas Halaman**: Satu ketukan pada Sub-Kategori di halaman Rangkuman akan mengarahkan Anda ke daftar Transaksi yang sudah terfilter secara presisi sesuai Bulan dan Nama Sub-Kategori.
- **Manajemen Akun/Dompet**: Pantau saldo berbagai rekening bank, e-wallet, atau uang tunai Anda secara *real-time* dengan sinkronisasi akurat.
- **PWA Ready**: Dapat diinstal sebagai aplikasi native di iOS, Android, maupun Desktop (Windows/Mac) tanpa perlu masuk ke App Store / Play Store.

---

## 🛠️ Arsitektur & Tech Stack

Aplikasi ini dibangun di atas pondasi arsitektur **Jamstack** modern:
- **Framework**: [Next.js 14+](https://nextjs.org/) (Menggunakan sistem *App Router*)
- **Frontend / UI**: React.js dengan [Tailwind CSS](https://tailwindcss.com/) (Desain token kustom dan utilitas modern)
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL-as-a-Service)
- **State Management & Realtime**: React Context API (`AppProvider`) dipadukan dengan *Supabase Realtime Channel Subscription* untuk sinkronisasi seketika antar perangkat.
- **Data Visualization**: [Recharts](https://recharts.org/) (Untuk visualisasi grafik yang responsif)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PWA Module**: `next-pwa`

---

## 🗄️ Skema Database (Supabase PostgreSQL)

Aplikasi ini menggunakan 5 tabel utama yang saling berelasi dengan tipe data UUID:

1. **`accounts`** (Akun / Dompet Utama)
   - `id` (UUID, Primary Key)
   - `name` (String: Nama Akun, misal: "BCA", "Gopay")
   - `type` (String: Tipe akun)
   - `balance` (Numeric: Saldo saat ini, otomatis terupdate via sinkronisasi klien)

2. **`transactions`** (Data Arus Kas)
   - `id` (UUID, Primary Key)
   - `date` (String YYYY-MM-DD: Waktu transaksi)
   - `account_id` (UUID: Relasi ke `accounts`)
   - `account_name` (String: Snapshot nama akun)
   - `type` (String: `pemasukan` / `pengeluaran` / `transfer`)
   - `amount` (Numeric: Nominal)
   - `category` (String: Nama kategori induk)
   - `subcategory` (String: Nama sub-kategori)
   - `notes` (String: Catatan opsional)

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
│   ├── akun/           # Halaman Manajemen Akun & Saldo
│   ├── anggaran/       # Halaman Setup Budget & Kategori/Sub
│   ├── hub/            # Halaman Portal Utama Masa Depan
│   ├── rangkuman/      # Halaman Analitik & Pie Chart
│   ├── transaksi/      # Halaman List & Riwayat Transaksi
│   ├── globals.css     # CSS Utama (Tailwind Setup)
│   ├── layout.js       # Layout PWA Inti & Metadata
│   └── page.js         # Landing Page / Index Redirector
├── components/
│   ├── AppProvider.js  # Jantung Aplikasi (Context, Realtime, Global State)
│   ├── BottomNav.js    # Komponen Navigasi Bawah
│   └── TransactionForm.js # Form Modal (Tambah/Edit) Transaksi (Floating)
├── lib/
│   └── supabase.js     # Inisialisasi Klien Database Supabase
├── public/
│   ├── manifest.json   # Konfigurasi PWA (Warna, Nama, Icon)
│   └── icons/          # Berisi Icon Aplikasi (192x192, 512x512)
├── .env.local          # Environment Variables (Supabase Keys) - Tidak masuk ke Github
├── next.config.mjs     # Konfigurasi Next.js & next-pwa
└── package.json        # Depedency & Scripts
```

---

## ⚙️ Sistem Aplikasi (Alur Logika)

1. **Bootstraping & Data Hydration**: Saat aplikasi dimuat, `AppProvider` menarik (*fetch*) seluruh isi dari ke-5 tabel Supabase. 
2. **Real-time Live Sync**: `AppProvider` memasang *listener* (`supabase.channel`). Jika Anda menambahkan transaksi di HP, layar laptop yang sedang membuka aplikasi yang sama akan langsung ter-update dalam hitungan milidetik tanpa perlu *refresh*.
3. **Smart Balances**: Nilai saldo pada `accounts` di-sinkronisasikan secara seimbang setiap kali Anda menyimpan atau menghapus transaksi melalui `TransactionForm.js`. Jika `pemasukan` dihapus, saldo akan berkurang, dan sebaliknya.
4. **Hierarchical Budgets**: Kalkulasi budget di halaman `Anggaran` dan `Rangkuman` menelusuri ke bawah (*drill-down*). Jika Kategori memiliki Sub-Kategori, perhitungan Budget akan dimatikan di level atas dan ditarik langsung (di-sum) dari limit per sub-kategori. Ini menghindari duplikasi anggaran ganda.
5. **Month Filtering**: Memiliki mekanisme pencarian (`monthKey`) yang selaras antara halaman `Rangkuman` dan `Transaksi`, yang di-*parsing* dengan zona waktu lokal (Local Time) untuk memitigasi kegagalan pemfilteran akibat UTC offset (seperti +07:00).

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
