import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CustomerDashboard from '@/components/dashboard/CustomerDashboard'
import OperatorDashboard from '@/components/dashboard/OperatorDashboard'
import CourierDashboard from '@/components/dashboard/CourierDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Ambil data user dari auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ambil profil dari database
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // Jika profil tidak ditemukan, coba buat default (misal customer)
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Pelanggan Baru',
        phone_number: user.user_metadata?.phone_number || '',
        role: 'customer',
      })
      .select()
      .single()

    if (newProfile) {
      return <CustomerDashboard profile={newProfile} user={user} />
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <h1 className="text-xl font-bold text-red-600">Error</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Gagal memuat profil pengguna Anda.</p>
      </div>
    )
  }

  // Render dashboard yang sesuai dengan role
  switch (profile.role) {
    case 'admin':
      return <AdminDashboard profile={profile} user={user} />
    case 'operator':
      return <OperatorDashboard profile={profile} user={user} />
    case 'courier':
      return <CourierDashboard profile={profile} user={user} />
    case 'customer':
    default:
      return <CustomerDashboard profile={profile} user={user} />
  }
}
