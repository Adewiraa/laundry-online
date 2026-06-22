# Dokumen Analisis Kebutuhan Sistem Laundry Online (EasyLaundry)

Dokumen ini berisi analisis kebutuhan, arsitektur sistem, skema database, dan rencana implementasi untuk pengembangan sistem laundry online berbasis web yang berfokus pada kemudahan penggunaan (*user-friendliness*) dan desain modern.

---

## 1. Konsep & Filosofi Desain (User-Friendly)
Aplikasi ini dirancang dengan prinsip **"Simplisitas Utama"**. Proses pemesanan oleh pelanggan diminimalkan menjadi **3 langkah mudah**:
1. **Pilih Layanan & Paket** (Kiloan/Satuan, Regular/Express).
2. **Tentukan Alamat & Waktu Penjemputan**.
3. **Pilih Metode Pembayaran & Konfirmasi**.

### Karakteristik Visual & UI/UX:
*   **Mobile-First Approach**: Sebagian besar pelanggan akan memesan melalui ponsel pintar. Desain harus sangat responsif.
*   **Visual Tracking**: Timeline status cucian yang interaktif dan mudah dipahami (seperti pelacakan kurir makanan online).
*   **Contrast & Readability**: Menggunakan tipografi bersih (misalnya, font *Plus Jakarta Sans* atau *Inter*), skema warna pastel yang menenangkan (biru muda/teal melambangkan kebersihan), dan tombol aksi (CTA) yang menonjol.
*   **Micro-Animations**: Transisi halus saat memilih layanan dan mengonfirmasi pesanan untuk memberikan umpan balik visual yang menyenangkan.

---

## 2. Analisis Peran Pengguna (User Personas)

Sistem ini memfasilitasi 4 peran utama dengan hak akses yang berbeda:

| Peran (Role) | Tanggung Jawab Utama | Fitur Utama |
| :--- | :--- | :--- |
| **Pelanggan** (Customer) | Memesan layanan laundry dan memantau status. | Registrasi/Login (OAuth/Email), Pemesanan, Pelacakan Real-time, Riwayat Transaksi, Manajemen Alamat. |
| **Kurir** (Driver) | Menjemput pakaian kotor dan mengantar pakaian bersih. | Daftar Tugas Penjemputan/Pengantaran, Update Status Pengiriman, Navigasi Alamat. |
| **Staf / Operator** | Memproses pencucian, pengeringan, dan penyetrikaan. | Update Langkah Kerja (Cuci, Kering, Setrika, Packing), Input Berat Riil (Timbangan). |
| **Admin / Owner** | Mengelola operasional keseluruhan dan laporan keuangan. | Dashboard Analitik (Pendapatan, Order Aktif), Manajemen Layanan & Harga, Manajemen Pengguna, Laporan Keuangan. |

---

## 3. Arsitektur Teknologi (Tech Stack)

*   **Frontend & Backend (BFF)**: **Next.js (versi terbaru, App Router)** dengan Server Actions untuk komunikasi data yang efisien tanpa memerlukan REST API terpisah yang rumit.
*   **Database**: **Supabase (PostgreSQL)**. Sangat cocok karena mendukung fitur **Realtime** (pelacakan status cucian instan) dan **Row Level Security (RLS)** untuk keamanan data pelanggan.
*   **Autentikasi**: **Supabase Auth** (mendukung Login via Email/Password dan Social Login seperti Google secara instan).
*   **Styling & UI Components**: **Tailwind CSS** + **shadcn/ui** (untuk komponen modern seperti Dialog, Sheet, Table, Progress Bar) + **Lucide React Icons**.

---

## 4. Perancangan Database (Supabase / PostgreSQL Schema)

### Script DDL SQL (Supabase Migration):
```sql
-- Buat Enum untuk Role Pengguna
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'courier', 'customer');

-- Buat Enum untuk Status Pesanan
CREATE TYPE order_status AS ENUM ('pending', 'pickup', 'processing', 'delivery', 'completed', 'cancelled');

-- Buat Enum untuk Status Pembayaran
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');

-- 1. Tabel Users (Ekstensi dari auth.users Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role user_role DEFAULT 'customer'::user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Alamat Pelanggan
CREATE TABLE public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL, -- e.g., 'Rumah', 'Kantor'
    full_address TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Layanan Laundry
CREATE TABLE public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- 'kg' atau 'pcs'
    price_per_unit NUMERIC(10, 2) NOT NULL,
    estimated_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Pesanan (Orders)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    courier_pickup_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    courier_delivery_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL NOT NULL,
    status order_status DEFAULT 'pending'::order_status NOT NULL,
    total_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    payment_status payment_status DEFAULT 'unpaid'::payment_status NOT NULL,
    payment_method TEXT DEFAULT 'cod' NOT NULL,
    scheduled_pickup TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Detail Item Pesanan
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL, -- berat atau jumlah unit
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 6. Tabel Log Perubahan Status (Untuk Realtime Tracker)
CREATE TABLE public.order_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 5. Alur Pengguna (User Flows)

### A. Alur Pemesanan Pelanggan (3-Click Flow)
1. **Pilih Layanan**: Pilih Laundry Kiloan atau Satuan beserta estimasi berat/jumlah.
2. **Atur Penjemputan**: Masukkan alamat penjemputan dan tentukan jadwal tanggal/jam penjemputan.
3. **Pembayaran**: Pilih metode pembayaran (COD/Cashless) dan konfirmasi pesanan.

### B. Alur Proses di Toko (Staf & Kurir)
1. **Penjemputan**: Kurir menerima notifikasi tugas penjemputan -> Kurir menuju alamat pelanggan -> Menjemput pakaian -> Update status ke `pickup`.
2. **Penerimaan & Timbangan**: Pakaian tiba di laundry -> Operator menimbang ulang secara akurat -> Update detail pesanan (`order_items`) & tagihan final -> Status diubah ke `processing`. Pelanggan menerima notifikasi berat riil dan tagihan akhir.
3. **Pencucian & Setrika**: Operator melakukan proses pencucian -> Update sub-status (Cuci, Kering, Setrika, Packing).
4. **Pengiriman**: Operator mengubah status menjadi `delivery` -> Kurir mengantarkan pakaian bersih ke pelanggan -> Pelanggan melakukan pembayaran jika COD/Mengonfirmasi penerimaan -> Status selesai (`completed`).

---

## 6. Fitur Unggulan untuk Ramah Pengguna (User-Friendly Features)

1.  **Dashboard Status Interaktif (Visual Timeline)**:
    Pelanggan tidak perlu bertanya-tanya "di mana baju saya?". Gunakan visual progress bar real-time:
    `[Jemput] =======> [Cuci & Kering] =======> [Setrika & Lipat] =======> [Diantar]`
2.  **Integrasi Supabase Realtime**:
    Ketika admin mengubah status di panel admin, UI di ponsel pelanggan akan berubah secara otomatis dan instan tanpa perlu memuat ulang halaman (*refresh*).
3.  **Notifikasi Otomatis**:
    Meskipun notifikasi WhatsApp memerlukan API pihak ketiga, kita dapat memulai dengan **Notifikasi Dalam Aplikasi (In-App Notification)** menggunakan Supabase Realtime.
4.  **Desain Mobile Ringan (PWA Ready)**:
    Dibuat dengan Progressive Web App (PWA) agar pelanggan dapat menginstalnya di HP mereka langsung dari browser Chrome/Safari, menjadikannya seperti aplikasi native yang cepat dibuka.

---

## 7. Rencana Tahapan Pengembangan (Roadmap)

### **Fase 1: Minimum Viable Product (MVP) - Fokus Core Engine**
*   Inisialisasi Project Next.js terbaru dengan Tailwind CSS dan shadcn/ui.
*   Setup Supabase Database & Auth (Login via Google & Email).
*   Fitur Pemesanan untuk Pelanggan (pilih layanan, alamat, jadwal penjemputan).
*   Halaman Detail Pelacakan Pesanan Real-time sederhana.
*   Halaman Panel Operator Laundry (input berat timbangan, ganti status pesanan).

### **Fase 2: UI/UX Polish & Role Management**
*   Peningkatan estetika dashboard dengan grafik pendapatan untuk Owner/Admin.
*   Pemisahan halaman/dashboard khusus untuk Kurir (Daftar Penjemputan/Pengantaran).
*   Manajemen master data layanan (tambah/edit jenis laundry & tarif).
*   Implementasi filter pencarian pesanan dan ekspor data laporan sederhana.

### **Fase 3: Integrasi Pembayaran & Fitur Lanjutan**
*   Integrasi Payment Gateway (e.g., Midtrans) untuk pembayaran cashless (Gopay, ShopeePay, Transfer Bank).
*   PWA (Progressive Web App) setup agar bisa di-install di smartphone.
*   Sistem notifikasi WhatsApp otomatis.
