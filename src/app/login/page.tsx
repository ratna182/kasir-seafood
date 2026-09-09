'use client'

import { useState } from 'react'
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a2235 0%, #0a0e1a 70%)',
      padding: '1rem',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        animation: 'slideUp 0.4s ease',
      }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(249,115,22,0.35)',
          }}>
            🦐
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            color: 'var(--color-text)',
            marginBottom: '4px',
            lineHeight: 1.2,
          }}>
            Seafood & Nasi Uduk
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--color-primary)',
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            marginBottom: '8px',
          }}>
            Vian Jaya 08
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Sistem Kasir Digital
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{
            fontSize: '1.1rem',
            marginBottom: '1.5rem',
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
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>🔑</span>
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>

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
  )
}
