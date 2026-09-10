'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (data.success) {
        // Redirect berdasarkan role
        const role = data.user?.role
        if (role === 'OWNER') {
          router.push('/dashboard')
        } else {
          router.push('/transaksi')
        }
        router.refresh()
      } else {
        setError(data.message || 'Login gagal.')
        setPassword('')
      }
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Full-screen cover image as background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
      }}>
        <Image
          src="/cover-seafood.webp"
          alt="Vian Jaya 08 Seafood dan Nasi Uduk"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Dark overlay for contrast */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
        }} />
      </div>

      {/* Login card centered on top */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '400px',
        marginTop: '3rem',
        animation: 'slideUp 0.4s ease',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{
              fontSize: '1.6rem',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              color: 'var(--color-text)',
              marginBottom: '0.25rem',
              lineHeight: 1.2,
            }}>
              Seafood & Nasi Uduk
            </h1>
            <p style={{
              fontSize: '1.15rem',
              color: 'var(--color-primary)',
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              marginBottom: '0.25rem',
            }}>
              Vian Jaya 08
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Sistem Kasir Digital
            </p>
          </div>

          <h2 style={{
            fontSize: '1.1rem',
            marginBottom: '1.25rem',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
          }}>
            Masuk ke Kasir
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-login"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading || !username || !password}
              style={{ minHeight: '48px' }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}>
            Kasir Vian Jaya 08 — Sistem Kasir Digital v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
