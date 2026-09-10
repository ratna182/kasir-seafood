import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeSessionToken } from '@/lib/session'

// Routes yang tidak perlu auth
const publicRoutes = ['/login', '/api/auth/login']

// Routes khusus owner
const ownerOnlyRoutes = ['/menu', '/api/menu']

// Routes yang bisa diakses owner + kasir (kasir terbatas warung sendiri)
const sharedRoutes = ['/laporan', '/api/laporan']

// Routes khusus kasir
const kasirOnlyRoutes = ['/transaksi', '/api/transaksi', '/riwayat']

// Routes yang butuh spesifik outlet
const outletSpecificRoutes = ['/api/kasir', '/api/reports']

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

  // Get session token from cookie
  const sessionToken = request.cookies.get('kasir_session')?.value

  if (!sessionToken) {
    // Jika request API, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    // Redirect ke login untuk page routes
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Decode session
  const session = decodeSessionToken(sessionToken)
  if (!session) {
    // Session invalid, hapus cookie dan redirect ke login
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, message: 'Session expired' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url))
    
    response.cookies.delete('kasir_session')
    return response
  }

  // Check role-based access
  const isOwnerRoute = ownerOnlyRoutes.some(route => pathname.startsWith(route))
  const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route))
  const isKasirRoute = kasirOnlyRoutes.some(route => pathname.startsWith(route))

  // Owner tidak boleh akses kasir-only routes
  if (session.role === 'OWNER' && isKasirRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Owner cannot access kasir routes' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Kasir tidak boleh akses owner-only routes (bukan shared routes)
  if (session.role === 'KASIR' && isOwnerRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Kasir cannot access owner routes' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/transaksi', request.url))
  }

  // Kasir harus punya warungId
  if (session.role === 'KASIR' && !session.warungId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Kasir harus terdaftar di salah satu outlet' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add session info ke headers untuk API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-session-user-id', session.id)
  requestHeaders.set('x-session-role', session.role)
  if (session.warungId) {
    requestHeaders.set('x-session-warung-id', session.warungId)
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
