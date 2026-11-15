# Smart Budget & Investment Planner

Aplikasi web perencanaan keuangan pribadi — atur anggaran, catat transaksi, dan simulasikan pertumbuhan investasi jangka panjang. Desain **mobile-first** yang menyesuaikan tampilan desktop, bisa **dipasang sebagai aplikasi (PWA)** dan dipakai offline, serta bisa ekspor/impor ke **Excel** dan **Google Sheets**. Semua data disimpan di browser (`localStorage`), tidak memerlukan backend.

## Fitur Utama

| Menu | Fitur |
|------|-------|
| **Dasbor** | Ringkasan bulan ini: pendapatan, pengeluaran, sisa, tingkat tabungan; donut pengeluaran per kategori, arus kas 6 bulan, dan progres target keuangan |
| **Anggaran** | Input pendapatan bulanan; alokasi 50/30/20 (Kebutuhan/Keinginan/Tabungan) yang dapat diedit; tambah/ubah/hapus kategori kustom |
| **Transaksi** | Catat pemasukan & pengeluaran (tanggal, jumlah, kategori, catatan); filter per bulan & kategori, pencarian catatan; sisa anggaran per kategori otomatis |
| **Target Keuangan** | Buat target (nominal, dana terkumpul, tenggat opsional); catat setoran; progres dan estimasi tabungan per bulan agar tepat waktu |
| **Investasi** | Simulasi bunga majemuk bulanan; nilai riil setelah inflasi; perbandingan skenario pesimis/dasar/optimis; kalkulator kontribusi target; disclaimer proyeksi |
| **Data & Setelan** | Ekspor/impor JSON (dengan validasi; file versi lama tetap bisa diimpor), ekspor/impor **Excel (.xlsx)**, sinkron **Google Sheets**, tombol pasang aplikasi, reset semua data |

## Stack

- **React 18** + **TypeScript** (strict)
- **Vite** (bundler & dev server)
- **Tailwind CSS 3** + komponen gaya **shadcn/ui** (Radix UI) dengan tema hijau lembut (latar sage, kartu putih, tint pastel)
- **vite-plugin-pwa** (Workbox) untuk PWA; **read-excel-file** / **write-excel-file** untuk .xlsx (dimuat hanya saat dipakai)
- **Recharts** lewat komponen chart shadcn (`components/ui/chart.tsx`) untuk semua grafik
- Semua data di `localStorage` (versioned key, migrasi otomatis v1 → v2)

## Cara Menjalankan

```bash
# 1. Masuk ke folder proyek
cd smart-budget

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev
```

Buka browser di `http://localhost:5173`.

## Tampilan Mobile & Desktop

- **Ponsel dan tablet (di bawah 1024px):** navigasi berupa pil melayang di bawah layar (ikon saja) dan kartu ringkasan 2 kolom. Di bawah 768px, transaksi tampil sebagai daftar kartu.
- **Desktop (1024px ke atas):** sidebar berlabel di kiri, tabel penuh, grafik berdampingan di layar lebar (1280px ke atas).

## PWA (pasang & offline)

Service worker hanya aktif pada build production lewat HTTPS (atau `localhost`):

```bash
npm run build
npm run preview    # buka alamat yang tampil, lalu pasang lewat menu browser atau Data & Setelan
```

Setelah dibuka sekali, seluruh aplikasi (termasuk modul Excel) tersimpan untuk offline. Saat ada versi baru, muncul tombol **Muat ulang**; datamu di `localStorage` tidak terpengaruh. Di iPhone: Safari → Bagikan → **Tambah ke Layar Utama**.

## Ekspor & Impor Excel / Google Sheets

Excel dan Google Sheets memakai format yang sama: satu workbook dengan 4 tab (`Pengaturan`, `Kategori`, `Transaksi`, `Target`), baris pertama berisi judul kolom. Kamu boleh mengedit isinya lalu mengimpor kembali; urutan kolom bebas, tanggal boleh `YYYY-MM-DD` atau `DD/MM/YYYY`. Kesalahan isi ditampilkan dengan nama tab dan nomor baris. Sebelum data diganti, aplikasi menampilkan ringkasan dan meminta konfirmasi.

**Excel** langsung bisa dipakai (Data & Setelan → Ekspor/Impor Excel). Belum punya data? Klik **Unduh Template**: file berisi contoh isian dan tab `Petunjuk` (tab ini tidak ikut diimpor). Untuk Google Sheets tanpa pengaturan apa pun: ekspor ke Excel lalu buka lewat Google Sheets (File → Buka → Upload).

> **Status:** tombol Google Sheets sedang disembunyikan dari halaman Data & Setelan (saat ini yang tampil: JSON dan Excel). Kodenya tetap ada; untuk menampilkannya lagi, ubah `SHOW_GOOGLE_SHEETS` menjadi `true` di `src/components/SheetsPanel.tsx`.

**Sinkron Google Sheets langsung** memerlukan OAuth Client ID milikmu sendiri (gratis, tanpa kartu kredit):

1. Buka [Google Cloud Console](https://console.cloud.google.com/), buat proyek, lalu aktifkan **Google Sheets API** (APIs & Services → Library).
2. APIs & Services → **OAuth consent screen**: pilih *External*, isi nama aplikasi dan emailmu. Selama status *Testing*, tambahkan emailmu di **Test users**.
3. APIs & Services → **Credentials** → Create credentials → **OAuth client ID** → tipe **Web application**. Pada **Authorized JavaScript origins** isi `http://localhost:5173` dan alamat tempat aplikasi di-hosting (mis. `https://namamu.github.io`).
4. Salin `.env.example` menjadi `.env`, isi `VITE_GOOGLE_CLIENT_ID=<client id>`, lalu jalankan ulang `npm run dev` / `npm run build`.

Hal yang perlu diketahui:

- Izin yang diminta: membaca dan mengedit spreadsheet (`.../auth/spreadsheets`). Token hanya disimpan di memori dan hilang saat halaman ditutup; tidak pernah masuk `localStorage`.
- **Ekspor** dengan kolom tautan kosong membuat spreadsheet baru di Drive-mu. Jika kolom diisi, tab `Pengaturan`, `Kategori`, `Transaksi`, dan `Target` di spreadsheet itu **ditimpa**; tab lain tidak disentuh.
- Google hanya dihubungi saat kamu menekan tombol Hubungkan, Ekspor, atau Impor. Ini bukan sinkronisasi otomatis dua arah.

### Build Production

```bash
npm run build      # compile TypeScript + bundle Vite
npm run preview    # preview build lokal
```

### Type Check

```bash
npm run typecheck  # tsc --noEmit
```

## Struktur Proyek

```
smart-budget/
├── index.html
├── .env.example                 # VITE_GOOGLE_CLIENT_ID (opsional)
├── public/                      # ikon PWA (192, 512, maskable, apple-touch) dan favicon
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx                 # entry point
    ├── App.tsx                  # layout, context, useReducer, view switching
    ├── types/
    │   └── index.ts             # shared TypeScript types
    ├── lib/
    │   ├── calculations.ts      # kalkulasi keuangan & investasi (pure functions)
    │   ├── formatting.ts        # format Rupiah, tanggal, persentase
    │   ├── storage.ts           # localStorage wrapper (versioned, try/catch)
    │   ├── validation.ts        # validasi input numerik & impor JSON
    │   ├── spreadsheet.ts       # AppData <-> tab spreadsheet (dipakai Excel & Google Sheets)
    │   ├── excel.ts             # baca/tulis .xlsx (dimuat saat dipakai)
    │   └── googleSheets.ts      # Google Identity Services + Sheets API v4
    ├── hooks/
    │   ├── useLocalStorage.ts   # generic typed localStorage hook
    │   └── useInstallPrompt.ts  # tombol "Pasang Aplikasi" (PWA)
    ├── components/
    │   ├── DashboardView.tsx
    │   ├── BudgetView.tsx
    │   ├── TransactionsView.tsx
    │   ├── GoalsView.tsx        # target keuangan
    │   ├── InvestmentView.tsx
    │   ├── SettingsView.tsx
    │   ├── SheetsPanel.tsx      # ekspor/impor Excel & Google Sheets
    │   ├── InstallCard.tsx      # pasang sebagai aplikasi
    │   ├── PwaPrompt.tsx        # toast "siap offline" / "versi baru tersedia"
    │   ├── GrowthChart.tsx      # area chart pertumbuhan investasi
    │   ├── ScenarioChart.tsx    # garis perbandingan skenario return
    │   ├── SpendingChart.tsx    # donut chart pengeluaran
    │   ├── CashflowChart.tsx    # batang pemasukan vs pengeluaran
    │   ├── ChartEmpty.tsx       # tampilan saat chart belum punya data
    │   └── ui/                  # komponen shadcn (button, card, dialog, chart, ...)
    └── styles/
        └── global.css           # token tema (HSL) dan base styles
```

## Catatan

- **Proyeksi investasi** dihitung dengan bunga majemuk bulanan (`balance = balance × (1 + r) + kontribusi`). Ini adalah proyeksi, bukan jaminan hasil nyata.
- Data disimpan dengan kunci `smart_budget_v1` (versi skema di dalamnya: 2). Data versi 1 dimigrasi otomatis dan target keuangan dimulai kosong. Jika data korup, aplikasi kembali ke default.
- **Perbandingan skenario** memakai return asumsi ±3 poin persentase; **nilai riil** = nilai akhir ÷ (1 + inflasi)^tahun.
- Warna tema diatur di `src/styles/global.css` (`--primary` untuk isian hijau, `--brand` untuk teks hijau, `--tint-*` untuk kartu pastel, `--chart-1` … `--chart-6`).
- Tidak ada lagi lebar minimum layar; tata letak berubah di breakpoint Tailwind `sm` (640px), `md` (768px), `lg` (1024px), dan `xl` (1280px).
