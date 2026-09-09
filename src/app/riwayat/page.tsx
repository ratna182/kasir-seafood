import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import RiwayatClient from './RiwayatClient'

export const metadata = {
  title: 'Riwayat Transaksi — Kasir Vian Jaya 08',
  description: 'Daftar transaksi hari ini dan cetak ulang struk.',
}

export default async function RiwayatPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const warungFilter = session.warungId || undefined

  const raw = await prisma.$queryRawUnsafe<
    Array<{
      id: string
      nomor_meja: string
      total: number
      tanggal: Date
      created_at: Date
    }>
  >(
    `SELECT id, nomor_meja, total, tanggal, created_at
     FROM transaksis
     WHERE ($1::text IS NULL OR warung_id = $1)
       AND tanggal >= $2 AND tanggal < $3
       AND status = 'SELESAI'
     ORDER BY created_at DESC`,
    warungFilter ?? null,
    today,
    tomorrow
  )

  const transaksiIds = raw.map((r) => r.id)

  const rawItems = transaksiIds.length > 0
    ? await prisma.$queryRawUnsafe<
        Array<{
          id: string
          transaksi_id: string
          nama_menu: string
          harga_satuan: number
          qty: number
          subtotal: number
        }>
      >(
        `SELECT id, transaksi_id, nama_menu, harga_satuan, qty, subtotal
         FROM transaksi_items
         WHERE transaksi_id = ANY($1::text[])`,
        transaksiIds
      )
    : []

  const itemsByTransaksi = new Map<string, typeof rawItems>()
  for (const item of rawItems) {
    const list = itemsByTransaksi.get(item.transaksi_id) || []
    list.push(item)
    itemsByTransaksi.set(item.transaksi_id, list)
  }

  const serialized = raw.map((t) => ({
    id: t.id,
    nomorMeja: t.nomor_meja,
    total: t.total,
    tanggal: t.tanggal.toISOString(),
    createdAt: t.created_at.toISOString(),
    items: (itemsByTransaksi.get(t.id) || []).map((i) => ({
      id: i.id,
      namaMenu: i.nama_menu,
      hargaSatuan: i.harga_satuan,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
  }))

  return (
    <div className="app-container">
      <Navbar session={session} activePage="riwayat" />
      <div className="content-area">
        <RiwayatClient session={session} initialTransaksis={serialized} />
      </div>
    </div>
  )
}
