'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Shirt,
  TrendingUp,
  Users,
  DollarSign,
  Layers,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react'

interface AdminDashboardProps {
  profile: any
  user: any
}

export default function AdminDashboard({ profile, user }: AdminDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<any[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    setLoading(true)
    try {
      // 1. Fetch Orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          *,
          customer_id (full_name, phone_number),
          address_id (label, full_address),
          order_items (
            *,
            service_id (name, unit, price_per_unit)
          )
        `)
        .order('created_at', { ascending: false })

      if (!ordersErr && ordersData) {
        setOrders(ordersData)

        // Calculate Revenue from completed orders
        const revenue = ordersData
          .filter((o) => o.status === 'completed')
          .reduce((sum, o) => sum + Number(o.total_price), 0)
        setTotalRevenue(revenue)
      }

      // 2. Fetch Total Customers Count
      const { count, error: countErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')

      if (!countErr && count !== null) {
        setTotalCustomers(count)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_id?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">
                EasyLaundry Admin Portal
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-full border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400">
                Owner: {profile.full_name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase">Pendapatan Selesai (Lunas)</p>
              <h1 className="text-3xl font-extrabold text-emerald-600 mt-2">
                Rp {totalRevenue.toLocaleString('id-ID')}
              </h1>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl dark:bg-emerald-950/30">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase">Pesanan Aktif</p>
              <h1 className="text-3xl font-extrabold text-blue-600 mt-2">
                {orders.filter((o) => ['pending', 'pickup', 'processing', 'delivery'].includes(o.status)).length}
              </h1>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-950/30">
              <Shirt className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase">Pelanggan Terdaftar</p>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">
                {totalCustomers}
              </h1>
            </div>
            <div className="p-3 bg-zinc-100 text-zinc-600 rounded-2xl dark:bg-zinc-800">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-5 mb-8 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Cari pelanggan atau ID Order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-zinc-500 flex items-center gap-1.5 whitespace-nowrap">
              Filter Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="pickup">Pickup</option>
              <option value="processing">Processing</option>
              <option value="delivery">Delivery</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table of Orders */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm overflow-hidden">
          <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-rose-600" /> Semua Riwayat Transaksi Laundry
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-zinc-500">Memuat data transaksi...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">Tidak ada riwayat cucian.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <tr>
                    <th scope="col" className="px-6 py-4">ID Order</th>
                    <th scope="col" className="px-6 py-4">Nama Pelanggan</th>
                    <th scope="col" className="px-6 py-4">Metode Bayar</th>
                    <th scope="col" className="px-6 py-4">Tagihan</th>
                    <th scope="col" className="px-6 py-4">Tanggal Pesan</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <td className="px-6 py-4 font-mono font-bold text-xs">#{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{order.customer_id?.full_name}</div>
                        <div className="text-xs text-zinc-400">{order.customer_id?.phone_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold uppercase text-xs">{order.payment_method}</span>
                        <div className={`text-xs ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {order.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">
                        Rp {order.total_price.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(order.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : order.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
