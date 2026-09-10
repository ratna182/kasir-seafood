import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeSessionToken, COOKIE_OWNER, COOKIE_KASIR } from '@/lib/session'

// Routes yang tidak perlu auth
const publicRoutes = ['/login', '/api/auth/login']

// Routes khusus owner
const ownerOnlyRoutes = ['/menu', '/api/menu']

// Routes yang bisa diakses owner + kasir (kasir terbatas warung sendiri)
const sharedRoutes = ['/laporan', '/api/laporan']

// Routes khusus kasir
const kasirOnlyRoutes = ['/transaksi', '/api/transaksi', '/riwayat']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip static files dan Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Baca kedua cookie
  const ownerToken = request.cookies.get(COOKIE_OWNER)?.value
  const kasirToken = request.cookies.get(COOKIE_KASIR)?.value

  // Decode keduanya
  const ownerSession = ownerToken ? decodeSessionToken(ownerToken) : null
  const kasirSession = kasirToken ? decodeSessionToken(kasirToken) : null

  // Tentukan session aktif berdasarkan route
  const isOwnerRoute = ownerOnlyRoutes.some(route => pathname.startsWith(route))
  const isKasirRoute = kasirOnlyRoutes.some(route => pathname.startsWith(route))
  const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route))

  let activeSession = ownerSession || kasirSession

  // Jika route spesifik, prioritaskan session yang sesuai
  if (isOwnerRoute && ownerSession) activeSession = ownerSession
  if (isKasirRoute && kasirSession) activeSession = kasirSession

  if (!activeSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Owner tidak boleh akses kasir-only routes
  if (activeSession.role === 'OWNER' && isKasirRoute) {
    // Kecuali kalau ada kasir session juga
    if (!kasirSession) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: Owner cannot access kasir routes' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Pakai kasir session untuk kasir routes
    activeSession = kasirSession
  }

  // Kasir tidak boleh akses owner-only routes
  if (activeSession.role === 'KASIR' && isOwnerRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Kasir cannot access owner routes' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/transaksi', request.url))
  }

  // Kasir harus punya warungId
  if (activeSession.role === 'KASIR' && !activeSession.warungId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Kasir harus terdaftar di salah satu outlet' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add session info ke headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-session-user-id', activeSession.id)
  requestHeaders.set('x-session-role', activeSession.role)
  if (activeSession.warungId) {
    requestHeaders.set('x-session-warung-id', activeSession.warungId)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
