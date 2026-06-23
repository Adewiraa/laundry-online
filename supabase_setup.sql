-- Database Setup untuk Sistem Laundry Online (EasyLaundry)
-- Jalankan script ini di SQL Editor Supabase Anda.

-- Buat Enum untuk Role Pengguna jika belum ada
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'operator', 'courier', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Buat Enum untuk Status Pesanan jika belum ada
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'pickup', 'processing', 'delivery', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Buat Enum untuk Status Pembayaran jika belum ada
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Tabel Profiles (Menghubungkan Auth Supabase ke data profil)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role user_role DEFAULT 'customer'::user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS) untuk profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Buat policy RLS untuk profiles
CREATE POLICY "Pengguna dapat membaca profil sendiri" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Pengguna dapat memperbarui profil sendiri" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Admin dapat melihat semua profil" ON public.profiles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin'::user_role);

-- Trigger otomatis untuk membuat profile saat user mendaftar di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User Baru'),
    new.raw_user_meta_data->>'phone_number',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Tabel Alamat Pelanggan (Addresses)
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL, -- e.g., 'Rumah', 'Kantor'
    full_address TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna dapat mengelola alamat sendiri" ON public.addresses
    FOR ALL USING (auth.uid() = user_id);


-- 3. Tabel Layanan Laundry (Services)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- 'kg' atau 'pcs'
    price_per_unit NUMERIC(10, 2) NOT NULL,
    estimated_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua orang dapat melihat layanan aktif" ON public.services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin dapat mengelola layanan" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- 4. Tabel Pesanan (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pelanggan dapat melihat pesanan mereka sendiri" ON public.orders
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Pelanggan dapat membuat pesanan baru" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Kurir dan Operator dapat melihat/mengupdate pesanan" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'courier')
        )
    );


-- 5. Tabel Detail Item Pesanan (Order Items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL, -- berat atau jumlah unit
    subtotal NUMERIC(10, 2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pelanggan dapat melihat item pesanan sendiri" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Staf dan Kurir dapat melihat/mengelola semua item pesanan" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'courier')
        )
    );


-- 6. Tabel Log Perubahan Status (Order Status Logs)
CREATE TABLE IF NOT EXISTS public.order_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pelanggan dapat melihat log status pesanan mereka sendiri" ON public.order_status_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_logs.order_id AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Staf dan Kurir dapat mengelola log status" ON public.order_status_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator', 'courier')
        )
    );


-- Masukkan Data Layanan Awal (Dummy Services)
INSERT INTO public.services (name, unit, price_per_unit, estimated_days) VALUES
('Cuci Setrika Kiloan (Reguler)', 'kg', 7000.00, 3),
('Cuci Setrika Kiloan (Express)', 'kg', 12000.00, 1),
('Setrika Saja Kiloan', 'kg', 5000.00, 2),
('Cuci Satuan Kemeja', 'pcs', 10000.00, 2),
('Cuci Satuan Bedcover', 'pcs', 35000.00, 3)
ON CONFLICT DO NOTHING;
