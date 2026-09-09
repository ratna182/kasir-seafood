import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Navbar from '@/components/Navbar'
import ProfilClient from './ProfilClient'

export const metadata = {
  title: 'Profil — Kasir Vian Jaya 08',
  description: 'Lihat dan update profil akun Anda.',
}

export default async function ProfilPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="app-container">
      <Navbar session={session} activePage={undefined} />
      <div className="content-area">
        <ProfilClient session={session} />
      </div>
    </div>
  )
}
