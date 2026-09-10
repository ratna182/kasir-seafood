'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      minHeight: '100vh',
      display: 'grid',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #07111F 0%, #101B2B 48%, #2A1014 100%)',
      padding: 'clamp(1rem, 3vw, 2.5rem)',
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 18% 20%, rgba(185,28,28,0.22), transparent 28%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.10), transparent 30%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '1040px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: 'clamp(1rem, 3vw, 2rem)',
        alignItems: 'stretch',
        position: 'relative',
        zIndex: 1,
      }}>
        <section style={{
          background: 'linear-gradient(160deg, rgba(16,27,43,0.96), rgba(42,16,20,0.92))',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '28px',
          padding: 'clamp(1rem, 3vw, 2rem)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '520px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '22px',
            padding: 'clamp(0.75rem, 2vw, 1.25rem)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.75)',
          }}>
            <Image
              src="/cover-seafood.webp"
              alt="Vian Jaya 08 Seafood dan Nasi Uduk"
              width={1200}
              height={900}
              priority
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '14px' }}
            />
          </div>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            color: 'var(--color-text)',
            marginTop: '1.5rem',
            marginBottom: '0.35rem',
            lineHeight: 1.2,
          }}>
            Seafood & Nasi Uduk
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--color-primary)',
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            marginBottom: '0.5rem',
          }}>
            Vian Jaya 08
          </p>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '34rem' }}>
            Sistem kasir cepat untuk meja aktif, pembayaran final, dan struk thermal 80mm.
          </p>
        </section>

        <section style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(1.5rem, 3vw, 2.25rem)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
          alignSelf: 'center',
        }}>
          <h2 style={{
            fontSize: '1.45rem',
            marginBottom: '0.5rem',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
          }}>
            Masuk ke Kasir
          </h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Gunakan akun outlet untuk mulai mencatat order meja.
          </p>

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
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
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
                <>
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}>
            Kasir Vian Jaya 08 - Sistem Kasir Digital v1.0
          </p>
        </section>

      </div>
    </div>
  )
}
