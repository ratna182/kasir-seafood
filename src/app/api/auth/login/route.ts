import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encodeSessionToken, SessionUser, getSessionCookieName } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validasi input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 }
      )
    }

    // Cari user
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

    // Verifikasi password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah.' },
        { status: 401 }
      )
    }

    // Buat session
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

    // Set cookie
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
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 jam dalam detik
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
