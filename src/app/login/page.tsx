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
    <div className="login-page">
      {/* Background image */}
      <div className="login-bg">
        <Image
          src="/cover-seafood.webp"
          alt="Vian Jaya 08 Seafood dan Nasi Uduk"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <div className="login-bg-overlay" />
      </div>

      {/* Login card */}
      <div className="login-wrapper">
        <div className="login-card">
          {/* Logo & branding */}
          <div className="login-header">
            <div className="login-logo">VJ</div>
            <h1 className="login-title">Vian Jaya 08</h1>
            <p className="login-subtitle">Seafood & Nasi Uduk</p>
            <p className="login-desc">Sistem Kasir Digital</p>
          </div>

          <h2 className="login-form-title">Masuk ke Kasir</h2>

          {error && (
            <div className="alert alert-error login-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input login-input"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="login-password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input login-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-login"
              className="btn btn-primary btn-full login-submit"
              disabled={loading || !username || !password}
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

          <p className="login-footer">
            Kasir Vian Jaya 08 — v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
