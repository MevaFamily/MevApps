# 📱 MevApps (Home Super-App) - v2.0.0 (The Clean & Smart Update)

MevApps adalah sebuah ekosistem aplikasi keuangan dan manajemen rumah (Super-App) modern berbasis **Progressive Web App (PWA)**. Aplikasi ini dirancang dengan antarmuka yang sangat minimalis, modern (*clean design*), serta memprioritaskan arsitektur data *real-time* yang cepat dan responsif. 

Pada pembaruan **v2.0.0**, MevApps membawa penyempurnaan UI/UX besar-besaran, menjadikannya sekelas aplikasi *native* profesional dengan fitur pencarian cerdas, gestur navigasi ala iOS, dan palet warna yang sangat elegan.

---

## 🚀 Fitur Utama & Terbaru (v2.0.0)

### 1. 🎨 UI/UX Premium & Gesture Ala iOS
- **Custom Clean Palette:** Menggunakan palet warna *custom Tailwind* (Soft Pastel Green, Soft Coral Pink, Soft Periwinkle Blue) yang sangat bersih, minimalis, dan konsisten di seluruh elemen aplikasi.
- **Swipe Gestures & Animations:** Didukung oleh `framer-motion` dan `react-swipeable`, Anda dapat berpindah antar menu utama (Transaksi -> Rangkuman -> Akun -> Hub) hanya dengan mengusap (swipe) layar ke kiri atau kanan dengan transisi *slide* yang super mulus ala iOS.
- **PWA Ready:** Rasakan pengalaman *native app* tanpa batas *browser* dengan menginstalnya di *home screen* iOS atau Android Anda.

### 2. 🔍 Pencarian Cerdas (Smart Search)
- Di halaman Transaksi, terdapat **Smart Search** multi-kriteria secara *real-time*. Anda bisa mencari transaksi hanya dengan mengetik **catatan (notes)**, **nama kategori**, **subkategori**, hingga **nominal angka** (misal: "50000"). Daftar riwayat akan langsung terfilter instan tanpa perlu memuat ulang halaman.

### 3. 🎯 Manajemen Akun & Target Tabungan
- **Target Tabungan (Progress Bar):** Setiap akun/dompet dapat diberikan "Target Tabungan". Sistem secara cerdas akan mengkalkulasi persentase dan memunculkan *Progress Bar* elegan (0-100%) untuk memantau sejauh mana target keuangan Anda tercapai.
- **Pengelompokan Akun:** Akun keuangan dikelompokkan secara rapi (misal: *Uang Ivan*, *Uang Melin*, *Tabungan*) dengan nilai saldo yang diwarnai otomatis (Hijau untuk positif, Merah untuk hutang/negatif).
- **Grafik Tren Kekayaan (Net Worth):** Lacak pertumbuhan aset Anda selama 6 bulan terakhir via *Line Chart* interaktif.

### 4. 📆 Anggaran (Budgeting) & Tagihan Rutin Pintar
- **Tagihan Rutin Otomatis (Recurring Bills):** Saat menyetel anggaran (*Budget*), Anda dapat mengaktifkan opsi **"Jadwalkan Tagihan Bulanan"** (menggunakan *toggle switch* bergaya iOS) dan memilih tanggal jatuh tempo.
- **Smart Reminder:** Jika sebuah tagihan (misal: Listrik/Internet) sudah melewati tanggal jatuh tempo di bulan ini dan belum dibayar, tagihan tersebut otomatis muncul di *section* **Reminder** di halaman Transaksi, menunggu persetujuan nominal 1-klik dari Anda.
- **Shortcut vs Reminder:** Antarmuka cerdas mencegah duplikasi kartu. Jika tagihan sudah masuk *Reminder*, maka ia tidak akan dimunculkan lagi di daftar *Shortcut Anggaran Tersisa*.

### 5. 📊 Rangkuman Analitik & Visualisasi Data
- **Historical Bar Chart:** Halaman Rangkuman kini menyajikan *Bar Chart* 6 bulan ke belakang, memudahkan Anda membandingkan histori performa pengeluaran atau pemasukan dengan bulan-bulan sebelumnya.
- **Filter 1 Baris:** *Toggle* cepat untuk melihat laporan **Harian**, **Mingguan**, dan **Bulanan**.
- **Pie Chart Proporsional:** Visualisasi donat (*Pie Chart*) interaktif untuk membedah komposisi kategori pengeluaran/pemasukan bulan berjalan.
- **Drill-down Cepat:** Klik pada daftar kategori di bawah grafik untuk langsung meluncur ke riwayat transaksi spesifik.

---

## 🛠️ Arsitektur & Tech Stack

Aplikasi ini dibangun di atas pondasi arsitektur **Jamstack** modern:
- **Framework**: [Next.js 16.2+](https://nextjs.org/) (Menggunakan sistem *App Router*)
- **Frontend / UI**: React.js 19 dengan [Tailwind CSS v4](https://tailwindcss.com/) (Desain token kustom dan *theme variable overrides*)
- **Gestur & Animasi**: `framer-motion` & `react-swipeable`
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL-as-a-Service)
- **State Management & Realtime**: `Zustand` dipadukan dengan *Supabase Realtime Channel Subscription* untuk sinkronisasi instan antar perangkat.
- **Security / Routing Guard**: Komponen `AuthGuard` klien memvalidasi status autentikasi secara global.
- **Data Visualization**: [Recharts](https://recharts.org/) (Pie Chart, Bar Chart, Line Chart)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PWA Module**: `@ducanh2912/next-pwa`

---

## 🗄️ Skema Database (Supabase PostgreSQL)

Aplikasi ini menggunakan tipe data UUID yang saling terelasi:

1. **`accounts`** (Akun / Dompet Utama)
   - `id` (UUID), `name`, `type`, `balance`, **`target_amount`** (Numeric, opsional untuk fitur target tabungan).

2. **`transactions`** (Data Arus Kas)
   - `id`, `date`, `account_id`, `destination_account_id`, `type`, `amount`, `category`, `subcategory`, `note`.

3. **`categories`** & **`subcategories`** (Struktur Master Data)
   - Hierarki Kategori Utama -> Sub-Kategori (berelasi *One-to-Many* via `category_id`).

4. **`budgets`** (Pengaturan Batas Anggaran & Tagihan Rutin)
   - `id`, `category` (UUID relasi), `amount_limit`, `month`.
   - **`is_recurring`** (Boolean), **`due_date`** (Numeric 1-31).

---

## 📂 Struktur Folder Aplikasi

```text
MevApps/
├── app/
│   ├── akun/           # Halaman Manajemen Akun & Target Tabungan
│   ├── anggaran/       # Halaman Setup Budget & Tagihan Rutin
│   ├── hub/            # Halaman Portal & Pengaturan
│   ├── login/          # Halaman Login
│   ├── rangkuman/      # Halaman Analitik & Grafik Histori 6 Bulan
│   ├── transaksi/      # Halaman Transaksi, Smart Search, & Reminder
│   ├── globals.css     # CSS Utama & Custom Soft Theme Variables
│   ├── layout.js       # Layout PWA Inti & SwipeWrapper
│   └── page.js         # Landing Page / Index Redirector
├── components/
│   ├── AppProvider.js  # Jantung Data Realtime (Supabase Listener)
│   ├── SwipeWrapper.js # Komponen Deteksi Gestur Usap & Animasi Halaman
│   ├── BottomNav.js    # Navigasi Bawah
│   └── TransactionForm.# Form Modal Transaksi
├── lib/
│   └── supabase.js     # Klien Supabase
└── public/             # PWA Manifest & Aset Ikon
```

---

## 💻 Cara Menjalankan Secara Lokal

1. Clone repository dan jalankan instalasi paket (*dependencies*):
   ```bash
   npm install
   ```
2. Buat file `.env.local` di *root directory* dan masukkan kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
3. Mulai server *development*:
   ```bash
   npm run dev
   ```
4. Buka `http://localhost:3000` di *browser*.
