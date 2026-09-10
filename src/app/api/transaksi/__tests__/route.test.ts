import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    kasirSesi: { findUnique: vi.fn() },
    menu: { findMany: vi.fn() },
    transaksi: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  getAuthContext: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  apiRateLimiter: { check: vi.fn(() => ({ allowed: true, remaining: 99, resetIn: 60000 })) },
}))

import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'
import type { AuthContext } from '@/lib/auth'

const context: AuthContext = {
  user: {
    id: 'kasir1',
    username: 'kasir1',
    namaLengkap: null,
    role: 'KASIR',
    warungId: 'warung1',
    warungNama: null,
    warungKode: null,
  },
  warungId: 'warung1',
}
const menu = {
  id: 'menu1',
  nama: 'Ikan Bakar',
  kategori: 'MAKANAN' as const,
  harga: 25000,
  warungId: 'warung1',
  isAktif: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Transaksi held order API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthContext).mockReturnValue(context)
    vi.mocked(requireRole).mockReturnValue(null)
    vi.mocked(prisma.kasirSesi.findUnique).mockResolvedValue(null)
  })

  it('rejects empty table number', async () => {
    const request = new NextRequest('http://localhost/api/transaksi', {
      method: 'POST',
      body: JSON.stringify({ nomorMeja: '', items: [{ menuId: 'menu1', qty: 1 }] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.message).toContain('Nomor meja')
  })

  it('creates an open order when table has no active order', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValue([menu])
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({
      transaksi: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'trx1', nomorMeja: 'Meja 1', status: 'OPEN', total: 25000, items: [] }),
      },
    } as never))

    const request = new NextRequest('http://localhost/api/transaksi', {
      method: 'POST',
      body: JSON.stringify({ nomorMeja: 'Meja 1', items: [{ menuId: 'menu1', qty: 1 }] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.status).toBe('OPEN')
  })

  it('keeps finished transaction list limited to paid orders', async () => {
    vi.mocked(prisma.transaksi.findMany).mockResolvedValue([])

    const response = await GET(new NextRequest('http://localhost/api/transaksi'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual([])
    expect(prisma.transaksi.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'SELESAI' }),
    }))
  })
})
