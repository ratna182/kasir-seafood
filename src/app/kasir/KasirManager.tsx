'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, UserCheck, UserX, Trash2, Eye, EyeOff } from 'lucide-react'

interface Warung {
  id: string
  nama: string
  kode: string
}

interface KasirUser {
  id: string
  username: string
  namaLengkap: string | null
  isActive: boolean
  createdAt: string
}

interface KasirManagerProps {
  warungs: Warung[]
}

export default function KasirManager({ warungs }: KasirManagerProps) {
  const [selectedWarung, setSelectedWarung] = useState(warungs[0]?.id || '')
  const [users, setUsers] = useState<KasirUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<KasirUser | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    namaLengkap: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (selectedWarung) {
      fetchUsers()
    }
  }, [selectedWarung])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?warung_id=${selectedWarung}`)
      const result = await res.json()
      if (result.success) {
        setUsers(result.data)
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal memuat data kasir' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Koneksi ke server terganggu' })
    } finally {
      setLoading(false)
    }
  }

  function handleOpenForm(user?: KasirUser) {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '',
        namaLengkap: user.namaLengkap || '',
      })
    } else {
      setEditingUser(null)
      setFormData({ username: '', password: '', namaLengkap: '' })
    }
    setErrors({})
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingUser(null)
    setFormData({ username: '', password: '', namaLengkap: '' })
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      if (editingUser) {
        const updateData: Record<string, unknown> = {
          namaLengkap: formData.namaLengkap || null,
        }
        if (formData.password) {
          updateData.password = formData.password
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
        const result = await res.json()

        if (result.success) {
          setFeedback({ type: 'success', message: 'Kasir berhasil diupdate!' })
          handleCloseForm()
          fetchUsers()
        } else {
          setErrors(result.errors || { message: result.message })
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warungId: selectedWarung,
            username: formData.username,
            password: formData.password,
            namaLengkap: formData.namaLengkap || null,
          }),
        })
        const result = await res.json()

        if (result.success) {
          setFeedback({ type: 'success', message: 'Kasir berhasil dibuat!' })
          handleCloseForm()
          fetchUsers()
        } else {
          setErrors(result.errors || { message: result.message })
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(user: KasirUser) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      const result = await res.json()

      if (result.success) {
        setFeedback({
          type: 'success',
          message: user.isActive ? 'Kasir berhasil dinonaktifkan' : 'Kasir berhasil diaktifkan',
        })
        fetchUsers()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' })
    }
  }

  async function handleDelete(user: KasirUser) {
    if (!confirm(`Hapus kasir "${user.username}"?`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()

      if (result.success) {
        setFeedback({ type: 'success', message: 'Kasir berhasil dihapus!' })
        fetchUsers()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Manajemen Kasir</h1>
          <p className="text-secondary text-sm">Kelola akun kasir untuk setiap outlet</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Tambah Kasir
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
          {feedback.message}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Pilih Warung</label>
        <select
          className="form-input"
          value={selectedWarung}
          onChange={(e) => setSelectedWarung(e.target.value)}
          style={{ maxWidth: '400px' }}
        >
          {warungs.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nama} ({w.kode})
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Username</th>
              <th>Nama Lengkap</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>Memuat data...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>Belum ada kasir</td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.namaLengkap || '-'}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-warning'}`}>
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenForm(user)}
                        className="btn btn-sm btn-ghost"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`btn btn-sm ${user.isActive ? 'btn-ghost' : 'btn-success'}`}
                      >
                        {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="btn btn-sm btn-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editingUser ? 'Edit Kasir' : 'Tambah Kasir Baru'}</h2>
            
            {errors.message && (
              <div className="alert alert-error">{errors.message}</div>
            )}

            <form onSubmit={handleSubmit}>
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Masukkan username"
                    required
                  />
                  {errors.username && <span className="text-danger text-sm">{errors.username}</span>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Password {editingUser ? '(Kosongkan jika tidak diubah)' : '*'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Masukkan password baru' : 'Masukkan password'}
                    required={!editingUser}
                    minLength={6}
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
                {errors.password && <span className="text-danger text-sm">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={handleCloseForm} className="btn btn-ghost">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Menyimpan...' : editingUser ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
