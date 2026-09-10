import { NextResponse } from 'next/server'
import { COOKIE_OWNER, COOKIE_KASIR } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' })

  const isProduction = process.env.NODE_ENV === 'production'
  const opts = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, maxAge: 0, path: '/' }

  response.cookies.set(COOKIE_OWNER, '', opts)
  response.cookies.set(COOKIE_KASIR, '', opts)

  return response
}
