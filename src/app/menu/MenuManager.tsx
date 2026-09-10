'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react'

export interface MenuItem {
  id: string
  warungId: string
  nama: string
  kategori: 'MAKANAN' | 'MINUMAN'
  harga: number
  isAktif: boolean
}

export default function MenuManager() {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MAKANAN' | 'MINUMAN'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({ nama: '', kategori: 'MAKANAN' as 'MAKANAN' | 'MINUMAN', harga: '', isAktif: true })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { fetchMenus() }, [])

  async function fetchMenus() {
    setLoading(true)
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      if (data.success) setMenus(data.data)
      else showFeedback('error', data.message || 'Gagal memuat menu')
    } catch { showFeedback('error', 'Koneksi ke server gagal') }
    finally { setLoading(false) }
  }

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  function openAddModal() {
    setEditingMenu(null); setFormData({ nama: '', kategori: 'MAKANAN', harga: '', isAktif: true }); setFormErrors({}); setIsModalOpen(true)
  }

  function openEditModal(menu: MenuItem) {
    setEditingMenu(menu); setFormData({ nama: menu.nama, kategori: menu.kategori, harga: menu.harga.toString(), isAktif: menu.isAktif }); setFormErrors({}); setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormErrors({})
    const errors: Record<string, string> = {}
    if (!formData.nama.trim()) errors.nama = 'Nama menu wajib diisi.'
    if (!formData.harga || isNaN(Number(formData.harga)) || Number(formData.harga) < 0) errors.harga = 'Harga harus berupa nominal angka valid.'
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    setSaving(true)
    try {
      if (editingMenu) {
        const res = await fetch(`/api/menu/${editingMenu.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: formData.nama.trim(), kategori: formData.kategori, harga: Number(formData.harga), isAktif: formData.isAktif }) })
        const data = await res.json()
        if (data.success) { showFeedback('success', `Menu "${formData.nama}" berhasil diperbarui!`); setIsModalOpen(false); fetchMenus() }
        else { if (data.errors) setFormErrors(data.errors); else showFeedback('error', data.message || 'Gagal memperbarui menu') }
      } else {
        const res = await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: formData.nama.trim(), kategori: formData.kategori, harga: Number(formData.harga) }) })
        const data = await res.json()
        if (data.success) { showFeedback('success', `Menu "${formData.nama}" berhasil ditambahkan!`); setIsModalOpen(false); fetchMenus() }
        else { if (data.errors) setFormErrors(data.errors); else showFeedback('error', data.message || 'Gagal menambahkan menu') }
      }
    } catch { showFeedback('error', 'Terjadi kesalahan sistem. Coba lagi.') }
    finally { setSaving(false) }
  }

  async function handleToggleStatus(menu: MenuItem) {
    try {
      const res = await fetch(`/api/menu/${menu.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAktif: !menu.isAktif }) })
      const data = await res.json()
      if (data.success) { showFeedback('success', `Menu "${menu.nama}" sekarang ${!menu.isAktif ? 'Aktif' : 'Nonaktif'}`); setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, isAktif: !m.isAktif } : m))) }
      else showFeedback('error', data.message || 'Gagal mengubah status menu')
    } catch { showFeedback('error', 'Gagal memperbarui status menu') }
  }

  async function handleDelete(menu: MenuItem) {
    if (!window.confirm(`Hapus menu "${menu.nama}"?`)) return
    setDeletingId(menu.id)
    try {
      const res = await fetch(`/api/menu/${menu.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { showFeedback('success', `Menu "${menu.nama}" berhasil dihapus.`); setMenus((prev) => prev.filter((m) => m.id !== menu.id)) }
      else showFeedback('error', data.message || 'Gagal menghapus menu.')
    } catch { showFeedback('error', 'Terjadi kesalahan saat menghapus menu.') }
    finally { setDeletingId(null) }
  }

  async function handleSyncMenus() {
    if (!confirm('Sync semua menu ke kasir 1, 2, 3? Menu lama di kasir akan diganti.')) return
    setSyncing(true)
    try {
      const res = await fetch('/api/menu/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) showFeedback('success', data.message)
      else showFeedback('error', data.message || 'Gagal sync menu.')
    } catch { showFeedback('error', 'Terjadi kesalahan saat sync menu.') }
    finally { setSyncing(false) }
  }

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchSearch = menu.nama.toLowerCase().includes(search.toLowerCase())
      const matchCategory = categoryFilter === 'ALL' || menu.kategori === categoryFilter
      const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && menu.isAktif) || (statusFilter === 'INACTIVE' && !menu.isAktif)
      return matchSearch && matchCategory && matchStatus
    })
  }, [menus, search, categoryFilter, statusFilter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Kelola Menu</h1>
          <p className="text-secondary text-sm">Atur daftar makanan, minuman, harga, dan ketersediaan menu warung.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleSyncMenus} disabled={syncing} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync ke Semua Kasir'}
          </button>
          <button id="btn-tambah-menu" onClick={openAddModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Tambah Menu Baru
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.25rem', animation: 'fadeIn 0.2s ease-out' }}>
          {feedback.message}
        </div>
      )}

      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input type="text" className="form-input" placeholder="Cari nama menu (cth: Udang, Es Teh)..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: '36px' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex' }}>
            <button onClick={() => setCategoryFilter('ALL')} className={`btn btn-sm ${categoryFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}>Semua ({menus.length})</button>
            <button onClick={() => setCategoryFilter('MAKANAN')} className={`btn btn-sm ${categoryFilter === 'MAKANAN' ? 'btn-primary' : 'btn-ghost'}`}>Makanan ({menus.filter((m) => m.kategori === 'MAKANAN').length})</button>
            <button onClick={() => setCategoryFilter('MINUMAN')} className={`btn btn-sm ${categoryFilter === 'MINUMAN' ? 'btn-primary' : 'btn-ghost'}`}>Minuman ({menus.filter((m) => m.kategori === 'MINUMAN').length})</button>
          </div>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p className="text-secondary">Memuat daftar menu...</p>
        </div>
      ) : filteredMenus.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>Tidak Ada Menu Ditemukan</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
            {search ? `Tidak ada menu yang sesuai dengan pencarian "${search}".` : 'Belum ada menu yang didaftarkan pada kategori ini.'}
          </p>
          {search ? <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm">Reset Pencarian</button> : <button onClick={openAddModal} className="btn btn-primary btn-sm">Tambah Menu Pertama</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Nama Menu</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Kategori</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Harga Satuan</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenus.map((menu) => (
                  <tr key={menu.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: menu.isAktif ? 1 : 0.6, transition: 'var(--transition)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}><div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{menu.nama}</div></td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ background: menu.kategori === 'MAKANAN' ? 'var(--color-brand-light)' : 'var(--color-success-light)', color: menu.kategori === 'MAKANAN' ? 'var(--color-brand)' : 'var(--color-success)', fontSize: '0.75rem' }}>
                        {menu.kategori === 'MAKANAN' ? 'Makanan' : 'Minuman'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                      Rp {menu.harga.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button onClick={() => handleToggleStatus(menu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span className={`badge ${menu.isAktif ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: menu.isAktif ? 'var(--color-success)' : 'var(--color-danger)' }} />
                          {menu.isAktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => openEditModal(menu)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }} title="Edit menu"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(menu)} disabled={deletingId === menu.id} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--color-danger)' }} title="Hapus menu"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}><span style={{ fontSize: '1.2rem' }}>×</span></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Nama Menu *</label>
                <input type="text" className="form-input" placeholder="Contoh: Kepiting Saus Padang" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} autoFocus required />
                {formErrors.nama && <span className="text-danger text-sm">{formErrors.nama}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Kategori *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setFormData({ ...formData, kategori: 'MAKANAN' })} className={`btn ${formData.kategori === 'MAKANAN' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'center' }}>Makanan</button>
                  <button type="button" onClick={() => setFormData({ ...formData, kategori: 'MINUMAN' })} className={`btn ${formData.kategori === 'MINUMAN' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'center' }}>Minuman</button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Harga Jual (Rp) *</label>
                <input type="number" min="0" step="500" className="form-input" placeholder="35000" value={formData.harga} onChange={(e) => setFormData({ ...formData, harga: e.target.value })} required />
                {formErrors.harga && <span className="text-danger text-sm">{formErrors.harga}</span>}
              </div>
              {editingMenu && (
                <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" id="chk-aktif" checked={formData.isAktif} onChange={(e) => setFormData({ ...formData, isAktif: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="chk-aktif" style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}><strong>Menu Aktif</strong> (tampil di halaman kasir transaksi)</label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="btn btn-ghost">Batal</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '120px' }}>{saving ? 'Menyimpan...' : editingMenu ? 'Simpan Perubahan' : 'Tambah Menu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
