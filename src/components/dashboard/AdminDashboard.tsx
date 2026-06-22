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
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Activity,
  Check,
  X,
  PlusCircle,
  Briefcase,
  AlertCircle
} from 'lucide-react'

interface AdminDashboardProps {
  profile: any
  user: any
}

export default function AdminDashboard({ profile, user }: AdminDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  // Navigation state
  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'users'>('orders')

  // Data States
  const [orders, setOrders] = useState<any[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [services, setServices] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Service Form States (CRUD)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [serviceUnit, setServiceUnit] = useState('kg')
  const [servicePrice, setServicePrice] = useState(0)
  const [serviceDays, setServiceDays] = useState(3)
  const [serviceError, setServiceError] = useState('')

  // Role Management State
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminStats()
    fetchServices()
    fetchProfiles()
  }, [])

  const fetchAdminStats = async () => {
    setLoading(true)
    try {
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

      // Fetch Total Customers Count
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

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false })
    if (data) setServices(data)
  }

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setProfiles(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  // CRUD Layanan / Services
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    setServiceError('')

    if (!serviceName || servicePrice <= 0 || serviceDays <= 0) {
      setServiceError('Mohon isi semua kolom dengan benar!')
      return
    }

    try {
      if (editingServiceId) {
        // Edit service
        const { error } = await supabase
          .from('services')
          .update({
            name: serviceName,
            unit: serviceUnit,
            price_per_unit: servicePrice,
            estimated_days: serviceDays,
          })
          .eq('id', editingServiceId)

        if (error) throw error
      } else {
        // Create service
        const { error } = await supabase.from('services').insert({
          name: serviceName,
          unit: serviceUnit,
          price_per_unit: servicePrice,
          estimated_days: serviceDays,
          is_active: true,
        })

        if (error) throw error
      }

      setServiceName('')
      setServicePrice(0)
      setServiceDays(3)
      setEditingServiceId(null)
      setShowServiceModal(false)
      fetchServices()
    } catch (err: any) {
      setServiceError(err.message || 'Gagal menyimpan layanan')
    }
  }

  const handleToggleServiceStatus = async (serviceId: string, currentActiveStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentActiveStatus })
        .eq('id', serviceId)

      if (error) throw error
      fetchServices()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status layanan')
    }
  }

  // Mengubah Role Pengguna
  const handleUpdateUserRole = async (profileId: string, newRole: string) => {
    setUpdatingProfileId(profileId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId)

      if (error) throw error
      fetchProfiles()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah peran pengguna')
    } finally {
      setUpdatingProfileId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_id?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredProfiles = profiles.filter((p) =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone_number?.includes(searchQuery)
  )

  // Hitung data pendapatan untuk chart batang sederhana (Breakdown per status)
  const getStatusChartData = () => {
    const statuses = ['pending', 'pickup', 'processing', 'delivery', 'completed']
    return statuses.map((status) => {
      const count = orders.filter((o) => o.status === status).length
      return { status, count }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 text-white shadow-md shadow-rose-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">
                EasyLaundry Admin Portal
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-full border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900">
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
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto gap-2">
          <button
            onClick={() => {
              setActiveTab('orders')
              setSearchQuery('')
            }}
            className={`pb-4 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === 'orders'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Pesanan & Transaksi
          </button>
          <button
            onClick={() => {
              setActiveTab('services')
              setSearchQuery('')
            }}
            className={`pb-4 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === 'services'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Kelola Layanan
          </button>
          <button
            onClick={() => {
              setActiveTab('users')
              setSearchQuery('')
            }}
            className={`pb-4 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition duration-150 ${
              activeTab === 'users'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Kelola Peran & Pengguna
          </button>
        </div>

        {/* Tab 1: Orders View */}
        {activeTab === 'orders' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pendapatan Selesai (Lunas)</p>
                  <h1 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                    Rp {totalRevenue.toLocaleString('id-ID')}
                  </h1>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl dark:bg-emerald-950/20">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pesanan Aktif</p>
                  <h1 className="text-3xl font-extrabold text-blue-600 mt-2">
                    {orders.filter((o) => ['pending', 'pickup', 'processing', 'delivery'].includes(o.status)).length}
                  </h1>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-950/20">
                  <Shirt className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pelanggan Terdaftar</p>
                  <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">
                    {totalCustomers}
                  </h1>
                </div>
                <div className="p-3 bg-zinc-100 text-zinc-600 rounded-2xl dark:bg-zinc-800">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Pendapatan & Status Visual Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Chart Batang Visual CSS */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-1.5">
                  <Activity className="h-5 w-5 text-rose-500" /> Distribusi Status Cucian Aktif
                </h3>
                
                <div className="space-y-4">
                  {getStatusChartData().map((item) => {
                    const maxCount = Math.max(...getStatusChartData().map((d) => d.count), 1)
                    const percent = (item.count / maxCount) * 100

                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                          <span>{item.status}</span>
                          <span>{item.count} order</span>
                        </div>
                        <div className="w-full h-3 bg-zinc-100 rounded-full dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rincian Target Layanan Terpopuler */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-1.5">
                    <Briefcase className="h-5 w-5 text-rose-500" /> Layanan Laundry
                  </h3>
                  <div className="space-y-3">
                    {services.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{s.name}</span>
                        <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-bold dark:bg-rose-950/20">
                          Rp {s.price_per_unit.toLocaleString('id-ID')} / {s.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('services')}
                  className="mt-6 w-full text-center text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
                >
                  Lihat & Kelola Semua Layanan &rarr;
                </button>
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
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : order.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                                  : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
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
          </>
        )}

        {/* Tab 2: Manage Services */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Shirt className="h-5 w-5 text-rose-600" /> Pengelolaan Paket Layanan Laundry
              </h2>
              <button
                onClick={() => {
                  setEditingServiceId(null)
                  setServiceName('')
                  setServiceUnit('kg')
                  setServicePrice(0)
                  setServiceDays(3)
                  setShowServiceModal(true)
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                <PlusCircle className="h-4.5 w-4.5" /> Tambah Layanan Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <tr>
                    <th scope="col" className="px-6 py-4">Nama Layanan</th>
                    <th scope="col" className="px-6 py-4">Satuan Unit</th>
                    <th scope="col" className="px-6 py-4">Harga / Unit</th>
                    <th scope="col" className="px-6 py-4">Estimasi Durasi</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">{service.name}</td>
                      <td className="px-6 py-4 uppercase font-bold text-xs text-zinc-500">{service.unit}</td>
                      <td className="px-6 py-4 font-semibold">Rp {service.price_per_unit.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-xs font-bold">{service.estimated_days} Hari</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleServiceStatus(service.id, service.is_active)}
                          className={`text-xs font-bold px-3 py-1 rounded-full border transition duration-150 ${
                            service.is_active
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {service.is_active ? 'Aktif' : 'Non-aktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingServiceId(service.id)
                            setServiceName(service.name)
                            setServiceUnit(service.unit)
                            setServicePrice(service.price_per_unit)
                            setServiceDays(service.estimated_days)
                            setShowServiceModal(true)
                          }}
                          className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: User Role Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-600" /> Hak Akses & Peran Pengguna (Role Management)
            </h2>

            <div className="mb-6 max-w-md relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Cari pengguna berdasarkan nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <tr>
                    <th scope="col" className="px-6 py-4">Nama Lengkap</th>
                    <th scope="col" className="px-6 py-4">Nomor HP</th>
                    <th scope="col" className="px-6 py-4">Tanggal Daftar</th>
                    <th scope="col" className="px-6 py-4">Peran Saat Ini</th>
                    <th scope="col" className="px-6 py-4">Ubah Hak Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{p.full_name}</div>
                        <div className="text-xs text-zinc-400">{p.id.slice(0, 15)}...</div>
                      </td>
                      <td className="px-6 py-4">{p.phone_number || '-'}</td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(p.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${
                            p.role === 'admin'
                              ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
                              : p.role === 'operator'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400'
                              : p.role === 'courier'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {p.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={p.role}
                          disabled={updatingProfileId === p.id}
                          onChange={(e) => handleUpdateUserRole(p.id, e.target.value)}
                          className="rounded-xl border border-zinc-250 bg-white py-2 px-3 text-xs outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                        >
                          <option value="customer">Customer (Pelanggan)</option>
                          <option value="courier">Courier (Kurir)</option>
                          <option value="operator">Operator (Staf Toko)</option>
                          <option value="admin">Admin (Owner)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Add/Edit Service */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Shirt className="h-5.5 w-5.5 text-rose-600" />
                {editingServiceId ? 'Edit Layanan Laundry' : 'Tambah Layanan Baru'}
              </h3>
              <button
                onClick={() => {
                  setShowServiceModal(false)
                  setServiceError('')
                }}
                className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {serviceError && (
              <div className="p-3.5 mb-4 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" /> {serviceError}
              </div>
            )}

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nama Layanan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cuci Kering Boneka"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Satuan Unit
                  </label>
                  <select
                    value={serviceUnit}
                    onChange={(e) => setServiceUnit(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="kg">KG (Kiloan)</option>
                    <option value="pcs">PCS (Satuan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Durasi (Hari)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={serviceDays}
                    onChange={(e) => setServiceDays(Number(e.target.value))}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Harga per Unit (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  value={servicePrice}
                  onChange={(e) => setServicePrice(Number(e.target.value))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-rose-500 dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="w-1/2 rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 py-3 text-sm font-bold text-white shadow-md hover:from-rose-750"
                >
                  Simpan Layanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
