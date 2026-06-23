'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Shirt, Mail, Lock, User, Phone, Loader2, Sparkles, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState('customer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        // Proses Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw new Error(error.message)
        }

        setMessage({ type: 'success', text: 'Berhasil masuk! Mengarahkan...' })
        router.refresh()
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        // Proses Register (Sign Up)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phoneNumber,
              role: role, // dynamic role chosen by user
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          throw new Error(error.message)
        }

        setMessage({
          type: 'success',
          text: 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi (atau langsung masuk jika fitur konfirmasi email dinonaktifkan).',
        })
        // Switch ke mode login
        setIsLogin(true)
        setFullName('')
        setPhoneNumber('')
        setPassword('')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-radial from-blue-50 to-indigo-100 px-4 py-12 dark:from-zinc-900 dark:to-black">
      {/* Dekorasi Background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/80 p-8 shadow-2xl backdrop-blur-lg border border-white/20 dark:bg-zinc-900/80 dark:border-zinc-800">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Shirt className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            EasyLaundry
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {isLogin ? 'Solusi pakaian bersih tanpa ribet' : 'Mulai hemat waktu Anda sekarang'}
          </p>
        </div>

        {/* Notifikasi Message */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm mb-6 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              {/* Input Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Input Nomor Telepon */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Phone className="h-5 w-5" />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Peran Akun (Role - untuk Testing) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Peran Akun (Role - untuk Testing)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Shield className="h-5 w-5" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="customer">Pelanggan (Customer)</option>
                    <option value="courier">Kurir (Courier)</option>
                    <option value="operator">Staf / Operator</option>
                    <option value="admin">Admin / Owner</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Input Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                placeholder="budi@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Kata Sandi
              </label>
              {isLogin && (
                <a href="#" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  Lupa Sandi?
                </a>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLogin ? (
              <>Masuk Sekarang <Sparkles className="h-4 w-4" /></>
            ) : (
              'Daftar Akun Baru'
            )}
          </button>
        </form>

        {/* Akun Demo/Testing */}
        {isLogin && (
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
              Pilihan Akun Demo (Testing)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@laundry.com')
                  setPassword('laundry123')
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 text-left font-medium transition cursor-pointer"
              >
                🔑 Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('operator@laundry.com')
                  setPassword('laundry123')
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 text-left font-medium transition cursor-pointer"
              >
                ⚙️ Operator
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('courier@laundry.com')
                  setPassword('laundry123')
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 text-left font-medium transition cursor-pointer"
              >
                🚚 Kurir (Courier)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('customer@laundry.com')
                  setPassword('laundry123')
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-200 text-left font-medium transition cursor-pointer"
              >
                👤 Pelanggan (Customer)
              </button>
            </div>
            <p className="mt-2.5 text-[10px] text-zinc-500 text-center leading-normal">
              *Pilih akun di atas untuk mengisi otomatis. Jika belum terdaftar di Supabase Auth Anda, silakan switch ke <b>Buat Akun Baru</b> dengan email tersebut.
            </p>
          </div>
        )}

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isLogin ? 'Belum punya akun?' : 'Sudah memiliki akun?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage(null)
              }}
              className="ml-1.5 font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              {isLogin ? 'Buat Akun Baru' : 'Masuk di Sini'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
