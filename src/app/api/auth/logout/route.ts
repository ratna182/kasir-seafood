import { NextResponse } from 'next/server'
import { getSessionCookieName } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' })
  
  response.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
