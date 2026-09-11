'use client'

import { useState, useEffect } from 'react'
import { Save, X, DollarSign } from 'lucide-react'

interface Warung {
  id: string
  nama: string
  kode: string
}

interface MenuHarga {
  id: string
  nama: string
  hargaDefault: number
  hargaOverride: number | null
}

export default function HargaWarungManager() {
  const [warungs, setWarungs] = useState<Warung[]>([])
  const [selectedWarung, setSelectedWarung] = useState<string>('')
  const [menus, setMenus] = useState<MenuHarga[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadWarungs()
  }, [])

  useEffect(() => {
    if (selectedWarung) loadMenus(selectedWarung)
  }, [selectedWarung])

  async function loadWarungs() {
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      if (data.success) {
        const uniqueWarungs = new Map<string, Warung>()
        for (const menu of data.data) {
          if (!uniqueWarungs.has(menu.warungId)) {
            uniqueWarungs.set(menu.warungId, {
              id: menu.warungId,
              nama: menu.warung?.nama || 'Unknown',
              kode: menu.warung?.kode || '??'
            })
          }
        }
        setWarungs(Array.from(uniqueWarungs.values()))
      }
    } catch {
      showFeedback('error', 'Gagal memuat warung')
    } finally {
      setLoading(false)
    }
  }

  async function loadMenus(warungId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/menu?warung_id=${warungId}`)
      const data = await res.json()
      if (data.success) {
        setMenus(data.data.map((m: { id: string; nama: string; harga: number; hargaDefault?: number }) => ({
          id: m.id,
          nama: m.nama,
          hargaDefault: m.hargaDefault || m.harga,
          hargaOverride: m.harga !== m.hargaDefault ? m.harga : null
        })))
      }
    } catch {
      showFeedback('error', 'Gagal memuat menu')
    } finally {
      setLoading(false)
    }
  }

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  function handleHargaChange(menuId: string, value: string) {
    setMenus(prev => prev.map(m => 
      m.id === menuId ? { ...m, hargaOverride: value === '' ? null : Number(value) } : m
    ))
  }

  async function saveHarga() {
    setSaving(true)
    try {
      for (const menu of menus) {
        if (menu.hargaOverride !== null) {
          await fetch('/api/admin/warung-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warungId: selectedWarung,
              menuId: menu.id,
              harga: menu.hargaOverride
            })
          })
        } else {
          await fetch(`/api/admin/warung-menu?warung_id=${selectedWarung}&menu_id=${menu.id}`, {
            method: 'DELETE'
          })
        }
      }
      showFeedback('success', 'Harga berhasil disimpan!')
      loadMenus(selectedWarung)
    } catch {
      showFeedback('error', 'Gagal menyimpan harga')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !selectedWarung) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Harga per Cabang</h1>
          <p className="text-sm text-gray-500">Atur harga khusus untuk setiap warung</p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-lg ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Cabang</label>
            <select
              value={selectedWarung}
              onChange={(e) => setSelectedWarung(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Pilih Warung --</option>
              {warungs.map(w => (
                <option key={w.id} value={w.id}>{w.nama} ({w.kode})</option>
              ))}
            </select>
          </div>
          
          {selectedWarung && (
            <button
              onClick={saveHarga}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          )}
        </div>
      </div>

      {selectedWarung && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Default</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Cabang</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menus.map(menu => (
                  <tr key={menu.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {menu.nama}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      Rp {menu.hargaDefault.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <input
                        type="number"
                        value={menu.hargaOverride ?? ''}
                        onChange={(e) => handleHargaChange(menu.id, e.target.value)}
                        placeholder={menu.hargaDefault.toString()}
                        className="w-32 text-right px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {menu.hargaOverride !== null && (
                        <button
                          onClick={() => handleHargaChange(menu.id, '')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
