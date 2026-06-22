import Link from 'next/link'
import { Shirt, Sparkles, Clock, Compass, ShieldCheck } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 overflow-hidden">
      
      {/* Background Shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Shirt className="h-5.5 w-5.5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">EasyLaundry</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-2xl border border-zinc-200 bg-white/80 dark:bg-zinc-900 dark:border-zinc-800 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50 transition duration-150"
          >
            Masuk / Daftar
          </Link>
          <Link
            href="/dashboard"
            className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 transition duration-150"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/50 px-4 py-1.5 text-xs font-semibold text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400 mb-6">
          <Sparkles className="h-4 w-4" /> Solusi Laundry Online Ramah Pengguna
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Pakaian Bersih, Wangi, & Rapi <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Hanya dengan 3 Klik
          </span>
        </h1>
        
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
          Kami jemput pakaian kotor Anda, cuci dengan bahan berkualitas, setrika rapi, dan antarkan kembali langsung ke pintu rumah Anda.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Link
            href="/login"
            className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 px-6 text-base font-bold text-white shadow-xl shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition duration-150"
          >
            Pesan Laundry Sekarang
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
          <div className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base">Super Cepat</h3>
            <p className="mt-2 text-sm text-zinc-500">Pilihan paket Regular hingga Express 1 hari selesai untuk kebutuhan mendesak Anda.</p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 mb-4">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base">Realtime Tracking</h3>
            <p className="mt-2 text-sm text-zinc-500">Pantau posisi kurir penjemputan dan proses pencucian Anda secara live setiap detiknya.</p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base">Kualitas Terjamin</h3>
            <p className="mt-2 text-sm text-zinc-500">Dicuci bersih higienis dengan deterjen premium dan setrika uap yang aman bagi serat pakaian.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 text-center text-xs text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-800/50">
        &copy; {new Date().getFullYear()} EasyLaundry. All rights reserved. Built with Next.js & Supabase.
      </footer>

    </div>
  )
}
