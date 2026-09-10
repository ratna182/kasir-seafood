import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getAuthContext: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  apiRateLimiter: { check: vi.fn(() => ({ allowed: true, remaining: 99, resetIn: 60000 })) },
}))

import { POST } from '../route'
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

describe('Bayar order API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthContext).mockReturnValue(context)
    vi.mocked(requireRole).mockReturnValue(null)
  })

  it('finalizes open order before receipt is rendered', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({
      transaksi: {
        findFirst: vi.fn().mockResolvedValue({ id: 'trx1', total: 25000, items: [{ id: 'item1' }] }),
        update: vi.fn().mockResolvedValue({ id: 'trx1', status: 'SELESAI', metodePembayaran: 'CASH', total: 25000, items: [{ id: 'item1' }] }),
      },
    } as never))

    const request = new NextRequest('http://localhost/api/transaksi/trx1/bayar', {
      method: 'POST',
      body: JSON.stringify({ metodePembayaran: 'CASH' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'trx1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('SELESAI')
  })

  it('rejects invalid payment method', async () => {
    const request = new NextRequest('http://localhost/api/transaksi/trx1/bayar', {
      method: 'POST',
      body: JSON.stringify({ metodePembayaran: 'TRANSFER' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'trx1' }) })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.message).toContain('Metode')
  })
})
