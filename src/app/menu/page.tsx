import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Navbar from '@/components/Navbar'
import MenuManager from './MenuManager'

export const metadata = {
  title: 'Kelola Menu — Kasir Vian Jaya 08',
  description: 'Manajemen daftar menu, harga, dan ketersediaan menu warung.',
}

export default async function MenuPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  // Hanya owner yang boleh akses halaman ini
  if (session.role !== 'OWNER') {
    redirect('/transaksi')
  }

  return (
    <div className="app-container">
      <Navbar session={session} activePage="menu" />
      <div className="content-area">
        <MenuManager />
      </div>
    </div>
  )
}
