'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Shirt,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Package,
  Weight,
  Layers,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react'

interface OperatorDashboardProps {
  profile: any
  user: any
}

export default function OperatorDashboard({ profile, user }: OperatorDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // State Timbangan (Weight Input)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [realWeight, setRealWeight] = useState<number>(0)
  const [updatingWeight, setUpdatingWeight] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  // Realtime subscription untuk operator dashboard
  useEffect(() => {
    const channel = supabase
      .channel('operator-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Realtime change received by operator:', payload)
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
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

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  // Update Status Pesanan
  const handleUpdateStatus = async (orderId: string, currentStatus: string, nextStatus: string) => {
    try {
      const descriptionMap: Record<string, string> = {
        pickup: 'Cucian sedang dijemput oleh kurir.',
        processing: 'Cucian telah sampai di toko dan mulai diproses pencucian.',
        delivery: 'Cucian selesai dikemas dan siap diantarkan oleh kurir.',
        completed: 'Cucian selesai diantar dan diterima oleh pelanggan.',
        cancelled: 'Pesanan dibatalkan.',
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error

      // Tambahkan ke log
      await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: nextStatus,
        description: descriptionMap[nextStatus] || `Status diperbarui ke ${nextStatus}`,
        updated_by: user.id,
      })

      fetchOrders()
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status')
    }
  }

  // Update Berat Riil Timbangan
  const handleSaveWeight = async (orderId: string, itemId: string, pricePerUnit: number) => {
    setUpdatingWeight(true)
    try {
      const finalSubtotal = pricePerUnit * realWeight

      // 1. Update quantity di order_items
      const { error: itemErr } = await supabase
        .from('order_items')
        .update({
          quantity: realWeight,
          subtotal: finalSubtotal,
        })
        .eq('id', itemId)

      if (itemErr) throw itemErr

      // 2. Update total_price di orders
      const { error: orderErr } = await supabase
        .from('orders')
        .update({
          total_price: finalSubtotal,
          status: 'processing', // Pindahkan otomatis ke processing saat ditimbang
        })
        .eq('id', orderId)

      if (orderErr) throw orderErr

      // 3. Buat log status processing
      await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: 'processing',
        description: `Pakaian telah ditimbang seberat ${realWeight} kg. Total tagihan disesuaikan menjadi Rp ${finalSubtotal.toLocaleString('id-ID')}. Mulai dicuci.`,
        updated_by: user.id,
      })

      setEditingOrderId(null)
      fetchOrders()
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan berat timbangan')
    } finally {
      setUpdatingWeight(false)
    }
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
      {/* Header */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Shirt className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">
                EasyLaundry Panel Operator
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900">
                Staff: {profile.full_name}
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

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase">Perlu Ditimbang / Dijemput</h3>
            <h1 className="text-3xl font-extrabold text-amber-500 mt-2">
              {orders.filter((o) => ['pending', 'pickup'].includes(o.status)).length}
            </h1>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase">Sedang Dicuci (Processing)</h3>
            <h1 className="text-3xl font-extrabold text-blue-600 mt-2">
              {orders.filter((o) => o.status === 'processing').length}
            </h1>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase">Total Pesanan Masuk</h3>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">{orders.length}</h1>
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
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-zinc-500 flex items-center gap-1.5 whitespace-nowrap">
              <Filter className="h-4 w-4" /> Filter Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Penjemputan</option>
              <option value="pickup">Sedang Dijemput</option>
              <option value="processing">Sedang Dicuci</option>
              <option value="delivery">Siap/Sedang Diantar</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* List Antrian */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" /> Antrian Pekerjaan Operator
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-zinc-500">Memuat antrian laundry...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">Tidak ada cucian yang cocok dengan filter.</div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/55 transition duration-150"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-zinc-500">#{order.id.slice(0, 8)}</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{order.customer_id?.full_name}</span>
                        <span className="text-xs text-zinc-500">({order.customer_id?.phone_number || '-'})</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Dipesan: {new Date(order.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Status:</span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          order.status === 'processing'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900'
                            : order.status === 'pickup'
                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-zinc-700 dark:text-zinc-300">
                    {/* Detail Items & Timbangan */}
                    <div>
                      <h4 className="font-bold text-zinc-950 dark:text-white mb-2 flex items-center gap-1.5">
                        <Weight className="h-4.5 w-4.5 text-indigo-500" /> Detail Cucian
                      </h4>
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="space-y-2">
                          <div className="flex justify-between max-w-md">
                            <span>Layanan: {item.service_id?.name}</span>
                            <span className="font-bold">
                              {item.quantity} {item.service_id?.unit}
                            </span>
                          </div>

                          {/* Fitur Timbang Ulang Real (Khusus Kiloan & Baru Datang) */}
                          {editingOrderId === order.id ? (
                            <div className="mt-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 max-w-md">
                              <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-400 mb-1.5">
                                Masukkan Berat Hasil Timbangan Riil (Kg)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={realWeight}
                                  onChange={(e) => setRealWeight(Number(e.target.value))}
                                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
                                />
                                <button
                                  onClick={() => handleSaveWeight(order.id, item.id, item.service_id?.price_per_unit)}
                                  disabled={updatingWeight}
                                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={() => setEditingOrderId(null)}
                                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            order.status === 'pending' || order.status === 'pickup' ? (
                              <button
                                onClick={() => {
                                  setEditingOrderId(order.id)
                                  setRealWeight(item.quantity)
                                }}
                                className="mt-1 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                              >
                                <Weight className="h-3.5 w-3.5" /> Timbang & Cuci Sekarang
                              </button>
                            ) : null
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Alamat & Catatan */}
                    <div>
                      <h4 className="font-bold text-zinc-950 dark:text-white mb-2 flex items-center gap-1.5">
                        <MapPin className="h-4.5 w-4.5 text-zinc-400" /> Lokasi Penjemputan / Pengantaran
                      </h4>
                      <p className="text-xs text-zinc-500 mb-1">({order.address_id?.label})</p>
                      <p className="text-sm">{order.address_id?.full_address}</p>
                      {order.address_id?.notes && (
                        <p className="text-xs text-zinc-400 mt-1">Catatan: "{order.address_id.notes}"</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap gap-3">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'pending', 'pickup')}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10"
                      >
                        Tugaskan Penjemputan (Kurir)
                      </button>
                    )}

                    {order.status === 'pickup' && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1 bg-zinc-100 px-3 py-2 rounded-xl">
                        <Clock className="h-3.5 w-3.5" /> Menunggu Pakaian Tiba di Toko untuk Ditimbang
                      </span>
                    )}

                    {order.status === 'processing' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'processing', 'delivery')}
                        className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-500/10"
                      >
                        Selesai Dicuci, Siap Antar (Packing)
                      </button>
                    )}

                    {order.status === 'delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'delivery', 'completed')}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/10 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Tandai Selesai Diterima Pelanggan
                      </button>
                    )}

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')}
                        className="rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 px-3.5 py-2.5 text-xs font-semibold"
                      >
                        Batalkan Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
