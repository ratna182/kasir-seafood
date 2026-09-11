import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encodeSessionToken, SessionUser, COOKIE_OWNER, COOKIE_KASIR } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { warung: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah.' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Akun kasir sedang dinonaktifkan owner.' },
        { status: 403 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah.' },
        { status: 401 }
      )
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
      role: user.role,
      warungId: user.warungId,
      warungNama: user.warung?.nama ?? null,
      warungKode: user.warung?.kode ?? null,
    }

    const token = await encodeSessionToken(sessionUser)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
        warung: user.warung ? {
          id: user.warung.id,
          nama: user.warung.nama,
          kode: user.warung.kode,
        } : null,
      },
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = user.role === 'OWNER' ? COOKIE_OWNER : COOKIE_KASIR

    // Set cookie untuk role yang login
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
