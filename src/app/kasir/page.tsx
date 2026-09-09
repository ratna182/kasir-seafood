import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import KasirManager from './KasirManager'

export const metadata = {
  title: 'Manajemen Kasir — Kasir Vian Jaya 08',
  description: 'Kelola akun kasir untuk setiap outlet.',
}

export default async function KasirPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  // Hanya owner yang boleh akses halaman ini
  if (session.role !== 'OWNER') {
    redirect('/transaksi')
  }

  // Ambil semua warung
  const warungs = await prisma.warung.findMany({
    orderBy: { nama: 'asc' },
  })

  return (
    <div className="app-container">
      <Navbar session={session} activePage="kasir" />
      <div className="content-area">
        <KasirManager warungs={warungs} />
      </div>
    </div>
  )
}
