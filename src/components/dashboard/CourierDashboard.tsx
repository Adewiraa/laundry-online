'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Shirt,
  MapPin,
  Phone,
  Truck,
  CheckCircle2,
  Calendar,
  Layers,
  Map
} from 'lucide-react'

interface CourierDashboardProps {
  profile: any
  user: any
}

export default function CourierDashboard({ profile, user }: CourierDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [pickupTasks, setPickupTasks] = useState<any[]>([])
  const [deliveryTasks, setDeliveryTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  // Realtime subscription untuk courier
  useEffect(() => {
    const channel = supabase
      .channel('courier-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer_id (full_name, phone_number),
        address_id (label, full_address, notes)
      `)
      .order('scheduled_pickup', { ascending: true })

    if (!error && data) {
      // Filter tugas jemput: status 'pickup' atau 'pending'
      setPickupTasks(data.filter((o) => ['pending', 'pickup'].includes(o.status)))
      // Filter tugas antar: status 'delivery'
      setDeliveryTasks(data.filter((o) => o.status === 'delivery'))
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const handleUpdateStatus = async (orderId: string, nextStatus: string, logMsg: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error

      await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: nextStatus,
        description: logMsg,
        updated_by: user.id,
      })

      fetchTasks()
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui tugas')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">
                EasyLaundry Panel Kurir
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
                Driver: {profile.full_name}
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            <p className="mt-3 text-sm text-zinc-500">Memuat rute tugas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Tugas Penjemputan */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-500" /> Daftar Tugas Jemput ({pickupTasks.length})
              </h2>

              {pickupTasks.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">Tidak ada tugas penjemputan aktif.</div>
              ) : (
                <div className="space-y-4">
                  {pickupTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800 bg-zinc-50/50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-xs font-bold text-zinc-400">#{task.id.slice(0, 8)}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                          Jemput
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-white text-base">{task.customer_id?.full_name}</h4>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`https://wa.me/${task.customer_id?.phone_number}`} target="_blank" className="hover:underline font-semibold text-blue-600">
                          {task.customer_id?.phone_number} (Kirim WA)
                        </a>
                      </p>

                      <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <p className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>({task.address_id?.label})</strong> {task.address_id?.full_address}
                          </span>
                        </p>
                        {task.address_id?.notes && (
                          <p className="text-xs text-zinc-400 mt-1 pl-5">Catatan: "{task.address_id.notes}"</p>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        {task.status === 'pending' ? (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'pickup', 'Kurir sedang dalam perjalanan menjemput pakaian.')}
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow-md"
                          >
                            Mulai Perjalanan Jemput
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'processing', 'Pakaian tiba di laundry untuk ditimbang.')}
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Tandai Pakaian Telah Dijemput
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tugas Pengantaran */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" /> Daftar Tugas Antar ({deliveryTasks.length})
              </h2>

              {deliveryTasks.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">Tidak ada tugas pengantaran aktif.</div>
              ) : (
                <div className="space-y-4">
                  {deliveryTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800 bg-zinc-50/50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-xs font-bold text-zinc-400">#{task.id.slice(0, 8)}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          Antar
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-white text-base">{task.customer_id?.full_name}</h4>
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`https://wa.me/${task.customer_id?.phone_number}`} target="_blank" className="hover:underline font-semibold text-blue-600">
                          {task.customer_id?.phone_number} (Kirim WA)
                        </a>
                      </p>

                      <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <p className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>({task.address_id?.label})</strong> {task.address_id?.full_address}
                          </span>
                        </p>
                        {task.address_id?.notes && (
                          <p className="text-xs text-zinc-400 mt-1 pl-5">Catatan: "{task.address_id.notes}"</p>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'completed', 'Pakaian bersih telah diterima kembali oleh pelanggan.')}
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Tandai Sukses Diantar & Selesai
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
