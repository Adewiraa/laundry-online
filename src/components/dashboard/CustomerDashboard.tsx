'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Plus,
  LogOut,
  Shirt,
  MapPin,
  Calendar,
  Clock,
  History,
  TrendingUp,
  AlertCircle,
  X,
  CheckCircle2,
  Package,
  Activity,
  Truck,
  DollarSign
} from 'lucide-react'

interface CustomerDashboardProps {
  profile: any
  user: any
}

export default function CustomerDashboard({ profile, user }: CustomerDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [orders, setOrders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // Form State untuk Order Baru
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [estimatedQuantity, setEstimatedQuantity] = useState(1)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [scheduledPickup, setScheduledPickup] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState('')

  // Payment States
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false)
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Ambil data awal
  useEffect(() => {
    fetchOrders()
    fetchServices()
    fetchAddresses()
  }, [])

  // Setup Supabase Realtime untuk reload orders secara live!
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime change received:', payload)
          fetchOrders() // Refresh orders jika ada perubahan status
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const fetchOrders = async () => {
    setLoadingOrders(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        address_id (label, full_address),
        order_items (
          *,
          service_id (name, unit, price_per_unit)
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoadingOrders(false)
  }

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true)
    if (data) setServices(data)
  }

  const fetchAddresses = async () => {
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id)
    if (data && data.length > 0) {
      setAddresses(data)
      setSelectedAddress(data[0].id)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  // Submit Order Baru
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrderError('')
    setOrderSuccess('')

    if (!selectedService || !selectedAddress || !scheduledPickup) {
      setOrderError('Semua kolom wajib diisi!')
      return
    }

    try {
      // 1. Pilih detail service untuk hitung subtotal awal
      const service = services.find((s) => s.id === selectedService)
      if (!service) throw new Error('Layanan tidak valid')

      const subtotal = service.price_per_unit * estimatedQuantity

      // 2. Simpan order baru
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          address_id: selectedAddress,
          status: 'pending',
          total_price: subtotal,
          payment_status: 'unpaid',
          payment_method: paymentMethod,
          scheduled_pickup: newScheduledPickupDate(scheduledPickup),
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // 3. Simpan item order
      const { error: itemErr } = await supabase.from('order_items').insert({
        order_id: newOrder.id,
        service_id: selectedService,
        quantity: estimatedQuantity,
        subtotal: subtotal,
      })

      if (itemErr) throw itemErr

      // 4. Tambah log awal status order
      await supabase.from('order_status_logs').insert({
        order_id: newOrder.id,
        status: 'pending',
        description: 'Pesanan berhasil dibuat oleh pelanggan. Menunggu kurir melakukan penjemputan.',
        updated_by: user.id,
      })

      setOrderSuccess('Cucian Anda sukses dipesan! Kurir akan segera meluncur.')
      fetchOrders()
      setTimeout(() => {
        setShowOrderModal(false)
        setOrderSuccess('')
      }, 2000)
    } catch (err: any) {
      setOrderError(err.message || 'Gagal membuat pesanan')
    }
  }

  // Tambahan Helper Alamat (jika user belum punya alamat)
  const handleAddDefaultAddress = async () => {
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        label: 'Rumah Utama',
        full_address: 'Jl. Melati No. 45, Kebayoran Baru, Jakarta Selatan',
        notes: 'Pagar warna hitam',
      })
      .select()

    if (!error && data) {
      fetchAddresses()
    }
  }

  const newScheduledPickupDate = (localDateTimeStr: string) => {
    // Ubah local datetime string ke format ISO
    return new Date(localDateTimeStr).toISOString()
  }

  // Inisiasi Pembayaran Midtrans / Mock
  const handleInitiatePayment = async (orderId: string) => {
    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memulai transaksi')

      if (data.isMock) {
        setActivePaymentOrderId(orderId)
        setShowMockPaymentModal(true)
      } else {
        if (!(window as any).snap) {
          const script = document.createElement('script')
          script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
          script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
          document.body.appendChild(script)
        }

        setTimeout(() => {
          if ((window as any).snap) {
            ;(window as any).snap.pay(data.snapToken, {
              onSuccess: function (result: any) {
                alert('Pembayaran sukses!')
                fetchOrders()
              },
              onPending: function (result: any) {
                alert('Menunggu pembayaran...')
              },
              onError: function (result: any) {
                alert('Pembayaran gagal!')
              },
            })
          } else {
            alert('Gagal memuat snap payment window. Silakan coba lagi.')
          }
        }, 1000)
      }
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan pembayaran')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Simulasi Pembayaran Sukses (Local Sandbox)
  const handleSimulatePaymentSuccess = async () => {
    if (!activePaymentOrderId) return
    setIsProcessingPayment(true)
    try {
      const { error: payErr } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', activePaymentOrderId)

      if (payErr) throw payErr

      await supabase.from('order_status_logs').insert({
        order_id: activePaymentOrderId,
        status: 'pending',
        description: 'Pembayaran cashless via E-Wallet/Transfer sukses disimulasikan.',
        updated_by: user.id,
      })

      setShowMockPaymentModal(false)
      setActivePaymentOrderId(null)
      fetchOrders()
    } catch (err: any) {
      alert(err.message || 'Gagal mensimulasikan pembayaran')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900'
      case 'pickup':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
      case 'processing':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900'
      case 'delivery':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
      case 'cancelled':
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu Penjemputan'
      case 'pickup':
        return 'Sedang Dijemput Kurir'
      case 'processing':
        return 'Sedang Dicuci & Setrika'
      case 'delivery':
        return 'Sedang Diantar Kurir'
      case 'completed':
        return 'Selesai'
      case 'cancelled':
        return 'Dibatalkan'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header / Navbar */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Shirt className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">
                EasyLaundry
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-sm text-zinc-600 dark:text-zinc-400">
                Halo, <strong className="text-zinc-800 dark:text-white">{profile.full_name}</strong>
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
        
        {/* Welcome Hero / CTA */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Cucian numpuk di rumah?</h1>
            <p className="mt-2 text-blue-100 max-w-md text-sm sm:text-base">
              Pesan sekarang, kurir kami akan mengambil pakaian kotor Anda secara gratis dan mengembalikannya dalam keadaan wangi dan rapi.
            </p>
          </div>
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-blue-600 shadow-md transition duration-200 hover:bg-blue-50 active:scale-95"
          >
            <Plus className="h-5 w-5" /> Pesan Laundry Baru
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Pesanan</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{orders.length}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cucian Aktif</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">
              {orders.filter((o) => ['pending', 'pickup', 'processing', 'delivery'].includes(o.status)).length}
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status Terkini</p>
            <span
              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mt-2 ${
                orders.length > 0 ? getStatusColor(orders[0].status) : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {orders.length > 0 ? getStatusLabel(orders[0].status) : 'Tidak ada'}
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Member Sejak</p>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-2">
              {new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
          </div>
        </div>

        {/* Section List Pesanan */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Status & Riwayat Cucian Anda</h2>
          </div>

          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-zinc-500">Memuat riwayat cucian...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shirt className="h-12 w-12 text-zinc-300 mb-3" />
              <h3 className="text-base font-semibold text-zinc-950 dark:text-white">Belum ada pesanan laundry</h3>
              <p className="text-sm text-zinc-500 max-w-xs mt-1">
                Anda belum pernah memesan laundry di sini. Silakan pesan pertama Anda sekarang!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 transition duration-200"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wide">
                          Order #{order.id.slice(0, 8)}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">
                        Dipesan pada:{' '}
                        {new Date(order.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs text-zinc-500 uppercase font-semibold">Total Tagihan</p>
                      <h4 className="text-lg font-bold text-blue-600">
                        Rp {order.total_price.toLocaleString('id-ID')}
                      </h4>
                      <span className={`inline-block text-xs font-bold ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {order.payment_status === 'paid' ? 'Lunas' : 'Belum Dibayar'} ({order.payment_method.toUpperCase()})
                      </span>
                      {order.payment_status === 'unpaid' && (
                        <button
                          onClick={() => handleInitiatePayment(order.id)}
                          disabled={isProcessingPayment}
                          className="mt-2 block w-full md:w-auto text-xs bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-xl hover:bg-emerald-700 transition"
                        >
                          Bayar Sekarang (Cashless)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detail Item & Alamat */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-4 text-sm text-zinc-700 dark:text-zinc-300">
                    <div className="space-y-1.5">
                      <h5 className="font-semibold text-zinc-900 dark:text-white">Detail Layanan:</h5>
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between max-w-sm">
                          <span>{item.service_id?.name}</span>
                          <span className="font-semibold">
                            {item.quantity} {item.service_id?.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-zinc-400" /> Lokasi Jemput:
                      </h5>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {order.address_id?.full_address} ({order.address_id?.label})
                      </p>
                      <p className="text-xs text-zinc-500">
                        Catatan: {order.address_id?.notes || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Visual Tracker Timeline (Realtime Status) */}
                  <div className="mt-5 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-4">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Progress Pencucian</p>
                    <div className="relative flex items-center justify-between w-full">
                      {/* Line Background */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-200 dark:bg-zinc-800 z-0"></div>
                      
                      {/* Active Line Progress */}
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 transition-all duration-500 z-0"
                        style={{
                          width:
                            order.status === 'pending'
                              ? '0%'
                              : order.status === 'pickup'
                              ? '33%'
                              : order.status === 'processing'
                              ? '66%'
                              : order.status === 'delivery'
                              ? '90%'
                              : order.status === 'completed'
                              ? '100%'
                              : '0%',
                        }}
                      ></div>

                      {/* Timeline Steps */}
                      {[
                        { key: 'pending', label: 'Dipesan', icon: Clock },
                        { key: 'pickup', label: 'Jemput', icon: Truck },
                        { key: 'processing', label: 'Cuci', icon: Shirt },
                        { key: 'delivery', label: 'Antar', icon: Package },
                        { key: 'completed', label: 'Selesai', icon: CheckCircle2 },
                      ].map((step, idx) => {
                        const StepIcon = step.icon
                        const isPast =
                          idx <=
                          ['pending', 'pickup', 'processing', 'delivery', 'completed'].indexOf(order.status)
                        const isCurrent = order.status === step.key

                        return (
                          <div key={step.key} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                isCurrent
                                  ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/20 scale-110'
                                  : isPast
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-zinc-400 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800'
                              }`}
                            >
                              <StepIcon className="h-4.5 w-4.5" />
                            </div>
                            <span
                              className={`mt-2 text-xs font-bold ${
                                isCurrent
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : isPast
                                  ? 'text-zinc-800 dark:text-zinc-200'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Pesan Baru */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Shirt className="h-6 w-6 text-blue-600" /> Buat Pesanan Baru
              </h3>
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setOrderError('')
                  setOrderSuccess('')
                }}
                className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {orderError && (
              <div className="p-3.5 mb-4 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" /> {orderError}
              </div>
            )}
            {orderSuccess && (
              <div className="p-3.5 mb-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5" /> {orderSuccess}
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Anda perlu memiliki minimal satu alamat penjemputan terdaftar terlebih dahulu.
                </p>
                <button
                  onClick={handleAddDefaultAddress}
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Tambahkan Alamat Rumah Utama (Otomatis)
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className="space-y-4">
                {/* Pilih Layanan */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Layanan Laundry
                  </label>
                  <select
                    required
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="">-- Pilih Paket Layanan --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - Rp {s.price_per_unit.toLocaleString('id-ID')} / {s.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Estimasi Kuantitas */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Estimasi Jumlah/Berat
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={estimatedQuantity}
                      onChange={(e) => setEstimatedQuantity(Number(e.target.value))}
                      className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>

                  {/* Metode Pembayaran */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Metode Pembayaran
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    >
                      <option value="cod">COD (Bayar di Tempat)</option>
                      <option value="e-wallet">E-Wallet / Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Pilih Alamat */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Alamat Penjemputan
                  </label>
                  <select
                    value={selectedAddress}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.full_address.slice(0, 30)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Waktu Penjemputan */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Waktu Penjemputan
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledPickup}
                    onChange={(e) => setScheduledPickup(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white py-3 px-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="w-1/2 rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
                  >
                    Pesan Cucian
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Modal Simulasi Pembayaran Cashless */}
      {showMockPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-5.5 w-5.5 text-emerald-600" /> Simulasi Midtrans Snap Sandbox
              </h3>
              <button
                onClick={() => {
                  setShowMockPaymentModal(false)
                  setActivePaymentOrderId(null)
                }}
                className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Midtrans Server Key tidak terdeteksi di server environment. Sistem otomatis mengalihkan ke mode <strong>Sandbox Simulator</strong>.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-150 dark:border-zinc-800 mb-6 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">ID Pesanan:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">#{activePaymentOrderId?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Metode Bayar:</span>
                <span className="font-bold text-indigo-600 uppercase">E-Wallet / Transfer</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMockPaymentModal(false)
                  setActivePaymentOrderId(null)
                }}
                className="w-1/2 rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimulatePaymentSuccess}
                disabled={isProcessingPayment}
                className="w-1/2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-md hover:from-emerald-705"
              >
                Simulasikan Lunas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
