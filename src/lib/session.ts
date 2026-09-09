import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface SessionUser {
  id: string
  username: string
  namaLengkap: string | null
  role: 'OWNER' | 'KASIR'
  warungId: string | null
  warungNama: string | null
  warungKode: string | null
}

// Simple session menggunakan signed cookie (base64 encoded JSON)
// Untuk production, gunakan library seperti iron-session atau next-auth

const SESSION_COOKIE = 'kasir_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-me'

function encodeSession(data: SessionUser): string {
  const json = JSON.stringify(data)
  const encoded = Buffer.from(json).toString('base64')
  // Simple HMAC-like signature untuk integrity check
  const signature = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString('base64').slice(0, 16)
  return `${encoded}.${signature}`
}

function decodeSession(token: string): SessionUser | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    
    const encoded = parts.slice(0, -1).join('.')
    const signature = parts[parts.length - 1]
    const expectedSig = Buffer.from(`${encoded}.${SESSION_SECRET}`).toString('base64').slice(0, 16)
    
    if (signature !== expectedSig) return null
    
    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

export function decodeSessionToken(token: string): SessionUser | null {
  return decodeSession(token)
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decodeSession(token)
}

export async function createSession(user: SessionUser): Promise<string> {
  return encodeSession(user)
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function encodeSessionToken(user: SessionUser): string {
  return encodeSession(user)
}

// Middleware helper — verifikasi sesi dan kembalikan user
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

// Verifikasi bahwa warung_id di sesi sesuai (tenant isolation)
export async function verifyTenantAccess(warungId: string): Promise<boolean> {
  const session = await getSession()
  return session?.warungId === warungId
}
