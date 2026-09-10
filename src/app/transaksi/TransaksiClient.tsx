'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, X, Minus, Plus, Printer, CreditCard, Banknote, CheckCircle, Trash2 } from 'lucide-react'

interface Menu {
  id: string
  nama: string
  kategori: string
  harga: number
  isAktif: boolean
}

interface CartItem {
  menuId: string
  nama: string
  harga: number
  qty: number
}

interface CompletedTransaksi {
  id: string
  nomorMeja: string
  total: number
  metodePembayaran?: string | null
  tanggal: string
  createdAt: string
  items: Array<{
    id?: string
    namaMenu: string
    hargaSatuan: number
    qty: number
    subtotal: number
  }>
}

type ActiveOrder = CompletedTransaksi & {
  updatedAt: string
  minutesOpen: number
}

interface TransaksiClientProps {
  session: {
    warungNama: string | null
    warungKode: string | null
    namaLengkap?: string | null
    username: string
    role: string
  }
  menus: Menu[]
  initialActiveOrders: ActiveOrder[]
  isKasirClosed: boolean
}

const QUICK_TABLES = ['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5', 'Meja 6', 'Meja 7', 'Meja 8', 'Meja 9', 'Meja 10', 'Meja 11', 'Meja 12', 'Meja 13', 'Meja 14', 'Meja 15', 'Meja 16', 'Meja 17', 'Meja 18', 'Meja 19', 'Meja 20', 'Meja 21', 'Meja 22', 'Meja 23', 'Meja 24', 'Meja 25', 'Bungkus']

export default function TransaksiClient({ session, menus, initialActiveOrders, isKasirClosed }: TransaksiClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [nomorMeja, setNomorMeja] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MAKANAN' | 'MINUMAN'>('ALL')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(initialActiveOrders)
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null)
  const [metodePembayaran, setMetodePembayaran] = useState<'CASH' | 'QRIS'>('CASH')
  const [completedTransaksi, setCompletedTransaksi] = useState<CompletedTransaksi | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchesSearch = menu.nama.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'ALL' || menu.kategori === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [menus, search, categoryFilter])

  const loadActiveOrders = useCallback(async () => {
    const res = await fetch('/api/transaksi/open')
    const data = await res.json()
    if (data.success) {
      const now = Date.now()
      setActiveOrders(data.data.map((order: ActiveOrder) => ({
        ...order,
        minutesOpen: Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000)),
      })))
    }
  }, [])

  function selectOrder(order: ActiveOrder) {
    setSelectedOrder(order)
    setNomorMeja(order.nomorMeja)
    setError('')
    setSuccess('')
  }

  function addToCart(menu: Menu) {
    if (isKasirClosed) return
    setCart((prev) => {
      const existing = prev.find((item) => item.menuId === menu.id)
      if (existing) {
        return prev.map((item) =>
          item.menuId === menu.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { menuId: menu.id, nama: menu.nama, harga: menu.harga, qty: 1 }]
    })
  }

  function updateQty(menuId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuId === menuId) {
            const newQty = item.qty + delta
            return newQty > 0 ? { ...item, qty: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  function removeFromCart(menuId: string) {
    setCart((prev) => prev.filter((item) => item.menuId !== menuId))
  }

  function resetOrderInput() {
    setCart([])
    setNomorMeja('')
    setSelectedOrder(null)
    setError('')
    setSuccess('')
  }

  const grandTotal = useMemo(() => cart.reduce((sum, item) => sum + item.harga * item.qty, 0), [cart])
  const totalItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])
  const selectedItemCount = useMemo(() => selectedOrder?.items.reduce((sum, item) => sum + item.qty, 0) || 0, [selectedOrder])

  async function handleCheckout() {
    setError('')
    setSuccess('')
    if (isKasirClosed) { setError('Kasir sudah ditutup. Tidak dapat membuat transaksi baru hari ini.'); return }
    if (!nomorMeja.trim()) { setError('Harap masukkan nomor meja atau pilih dari tombol meja.'); return }
    if (cart.length === 0) { setError('Keranjang pesanan masih kosong. Pilih menu di sebelah kiri.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorMeja: nomorMeja.trim(),
          items: cart.map((item) => ({ menuId: item.menuId, qty: item.qty })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedOrder(data.data)
        setSuccess('Order sementara tersimpan. Cetak struk dilakukan saat pembayaran final.')
        setCart([])
        await loadActiveOrders()
      } else {
        setError(data.message || 'Gagal menyimpan transaksi.')
      }
    } catch {
      setError('Koneksi internet bermasalah. Gagal menyimpan transaksi.')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrintReceipt() { window.print() }

  async function handleUpdateSavedItem(itemId: string, qty: number) {
    if (qty < 1) return
    setError('')
    const res = await fetch(`/api/transaksi/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    })
    const data = await res.json()
    if (data.success) { setSelectedOrder(data.data); await loadActiveOrders() }
    else { setError(data.message || 'Gagal mengubah item order.') }
  }

  async function handleDeleteSavedItem(itemId: string) {
    setError('')
    const res = await fetch(`/api/transaksi/items/${itemId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { setSelectedOrder(data.data); await loadActiveOrders() }
    else { setError(data.message || 'Gagal menghapus item order.') }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm('Hapus pesanan ini?')) return
    setError('')
    const res = await fetch(`/api/transaksi/${orderId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      if (selectedOrder?.id === orderId) { setSelectedOrder(null); setNomorMeja('') }
      await loadActiveOrders()
    } else {
      setError(data.message || 'Gagal menghapus pesanan.')
    }
  }

  async function handlePayOrder() {
    if (!selectedOrder) return
    if (cart.length > 0) { setError('Simpan tambahan item dulu sebelum bayar.'); return }
    setError('')
    setSuccess('')
    setPaying(true)
    try {
      const res = await fetch(`/api/transaksi/${selectedOrder.id}/bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodePembayaran }),
      })
      const data = await res.json()
      if (data.success) {
        setCompletedTransaksi(data.data)
        setShowReceiptModal(true)
        resetOrderInput()
        await loadActiveOrders()
      } else {
        setError(data.message || 'Gagal memproses pembayaran.')
      }
    } catch {
      setError('Koneksi internet bermasalah. Gagal memproses pembayaran.')
    } finally {
      setPaying(false)
    }
  }

  function handleNewOrder() {
    setShowReceiptModal(false)
    setCompletedTransaksi(null)
  }

  return (
    <div>
      {isKasirClosed && (
        <div className="alert alert-warning no-print" style={{ marginBottom: '1.25rem' }}>
          <div>
            <strong>Kasir Sudah Ditutup</strong>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Shift kasir hari ini telah ditutup. Pembuatan transaksi baru dinonaktifkan.
              Anda dapat melihat laporan di menu{' '}
              <Link href="/laporan" style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 600 }}>
                Laporan Harian
              </Link>.
            </p>
          </div>
        </div>
      )}

      {/* Meja Aktif */}
      <div className="card no-print" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Meja Aktif</h2>
        {activeOrders.length === 0 ? (
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>Belum ada order sementara.</p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeOrders.map((order) => {
              const count = order.items.reduce((sum, item) => sum + item.qty, 0)
              return (
                <div key={order.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => selectOrder(order)}
                    className={`btn btn-sm ${selectedOrder?.id === order.id ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {order.nomorMeja} · {count} item · Rp {order.total.toLocaleString('id-ID')} · {order.minutesOpen}m
                  </button>
                  {session.role === 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '4px', minWidth: 'auto' }}
                      title="Hapus pesanan"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* POS Two-Column Grid */}
      <div className="no-print pos-grid">
        {/* KOLOM KIRI: MENU PICKER */}
        <div>
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Cari menu (cth: Kepiting, Cumi, Jeruk)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setCategoryFilter('ALL')} className={`btn btn-sm ${categoryFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}>
                Semua ({menus.length})
              </button>
              <button type="button" onClick={() => setCategoryFilter('MAKANAN')} className={`btn btn-sm ${categoryFilter === 'MAKANAN' ? 'btn-primary' : 'btn-ghost'}`}>
                Makanan ({menus.filter((m) => m.kategori === 'MAKANAN').length})
              </button>
              <button type="button" onClick={() => setCategoryFilter('MINUMAN')} className={`btn btn-sm ${categoryFilter === 'MINUMAN' ? 'btn-primary' : 'btn-ghost'}`}>
                Minuman ({menus.filter((m) => m.kategori === 'MINUMAN').length})
              </button>
            </div>
          </div>

          {filteredMenus.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <ShoppingCart size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
              <p className="text-secondary">Tidak ada menu yang cocok dengan filter saat ini.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {filteredMenus.map((menu) => {
                const inCart = cart.find((item) => item.menuId === menu.id)
                return (
                  <div
                    key={menu.id}
                    onClick={() => addToCart(menu)}
                    className="card"
                    style={{
                      padding: '1rem',
                      cursor: isKasirClosed ? 'not-allowed' : 'pointer',
                      border: inCart ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                      background: inCart ? 'var(--color-brand-light)' : 'var(--color-surface)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'var(--transition)',
                      opacity: isKasirClosed ? 0.6 : 1,
                      userSelect: 'none',
                    }}
                  >
                    {inCart && (
                      <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'var(--color-brand)', color: '#fff',
                        fontWeight: 700, fontSize: '0.75rem', borderRadius: '12px',
                        padding: '0.15rem 0.5rem', boxShadow: 'var(--shadow-sm)',
                      }}>
                        {inCart.qty}x
                      </span>
                    )}
                    <div>
                      <div style={{
                        fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700,
                        color: menu.kategori === 'MAKANAN' ? 'var(--color-brand)' : 'var(--color-success)',
                        marginBottom: '4px',
                      }}>
                        {menu.kategori === 'MAKANAN' ? 'Makanan' : 'Minuman'}
                      </div>
                      <div style={{
                        fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)',
                        lineHeight: '1.3', marginBottom: '0.5rem',
                      }}>
                        {menu.nama}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{
                        fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        Rp {menu.harga.toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        disabled={isKasirClosed}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                          background: inCart ? 'var(--color-brand)' : 'var(--color-surface-raised)',
                          color: inCart ? '#fff' : 'var(--color-text-primary)',
                          fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isKasirClosed ? 'not-allowed' : 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: CART / ORDER SUMMARY */}
        <div className="card" style={{ position: 'sticky', top: '80px', padding: '1.25rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
              Pesanan ({selectedItemCount + totalItemCount} item)
            </h2>
            {cart.length > 0 && (
              <button type="button" onClick={resetOrderInput} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                <X size={14} /> Reset
              </button>
            )}
          </div>

          {/* Nomor Meja */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>
              Nomor Meja <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ketik nomor meja atau klik tombol di bawah..."
              value={nomorMeja}
              onChange={(e) => setNomorMeja(e.target.value)}
              style={{ marginBottom: '0.5rem', width: '100%' }}
              disabled={isKasirClosed}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {QUICK_TABLES.map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => {
                    const order = activeOrders.find((active) => active.nomorMeja === table)
                    if (order) selectOrder(order)
                    else { setSelectedOrder(null); setNomorMeja(table) }
                  }}
                  disabled={isKasirClosed}
                  className="btn btn-ghost btn-sm"
                  style={{
                    fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
                    background: nomorMeja === table ? 'var(--color-brand)' : 'var(--color-surface-raised)',
                    color: nomorMeja === table ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Order */}
          {selectedOrder && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Order tersimpan: {selectedOrder.nomorMeja}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} style={{ padding: '0.65rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.namaMenu}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Rp {item.hargaSatuan.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => item.id && handleUpdateSavedItem(item.id, item.qty - 1)} style={{ padding: '4px' }}><Minus size={14} /></button>
                      <strong>{item.qty}</strong>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => item.id && handleUpdateSavedItem(item.id, item.qty + 1)} style={{ padding: '4px' }}><Plus size={14} /></button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '75px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>Rp {item.subtotal.toLocaleString('id-ID')}</div>
                      <button type="button" onClick={() => item.id && handleDeleteSavedItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                <ShoppingCart size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Belum ada item pesanan.</p>
                <span style={{ fontSize: '0.75rem' }}>Klik menu di sebelah kiri untuk menambahkan.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cart.map((item) => (
                  <div key={item.menuId} style={{ padding: '0.75rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.nama}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        Rp {item.harga.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button type="button" onClick={() => updateQty(item.menuId, -1)} className="btn btn-ghost btn-sm" style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', borderRadius: '4px' }}>
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                        {item.qty}
                      </span>
                      <button type="button" onClick={() => updateQty(item.menuId, 1)} className="btn btn-ghost btn-sm" style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', borderRadius: '4px' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        Rp {(item.harga * item.qty).toLocaleString('id-ID')}
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.menuId)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Tambahan:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: "'Fraunces', serif", fontVariantNumeric: 'tabular-nums' }}>
                Rp {grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              id="btn-simpan-transaksi"
              onClick={handleCheckout}
              disabled={isKasirClosed || submitting || cart.length === 0}
              className="btn btn-primary w-full"
              style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 700, justifyContent: 'center' }}
            >
              {submitting ? 'Menyimpan Order...' : 'Simpan Pesanan'}
            </button>

            {selectedOrder && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <strong>Total Order</strong>
                  <strong style={{ fontVariantNumeric: 'tabular-nums' }}>Rp {selectedOrder.total.toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {(['CASH', 'QRIS'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setMetodePembayaran(method)}
                      className={`btn btn-sm ${metodePembayaran === method ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {method === 'CASH' ? <Banknote size={14} /> : <CreditCard size={14} />}
                      {method}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handlePayOrder}
                  disabled={paying || cart.length > 0 || selectedOrder.items.length === 0}
                  className="btn btn-success w-full"
                  style={{ justifyContent: 'center', fontWeight: 700 }}
                >
                  {paying ? 'Memproses...' : 'Konfirmasi & Cetak'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL STRUK */}
      {showReceiptModal && completedTransaksi && (
        <div className="modal-overlay no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <CheckCircle size={40} style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Transaksi Berhasil!</h3>
              <p className="text-secondary text-xs">
                Transaksi telah tercatat di sistem. Silakan cetak struk untuk pelanggan.
              </p>
            </div>

            <div style={{ background: '#ffffff', color: '#000000', padding: '1.25rem', borderRadius: '8px', fontFamily: "'Courier New', Courier, monospace", fontSize: '11px', lineHeight: '1.4', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: '1.25rem', maxHeight: '320px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px', display: 'block', textTransform: 'uppercase' }}>{session.warungNama}</strong>
                <span style={{ fontSize: '9px' }}>Cabang: {session.warungKode}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>No. Trx: #{completedTransaksi.id.slice(0, 8).toUpperCase()}</span>
                <span>{completedTransaksi.nomorMeja}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>
                  {new Date(completedTransaksi.createdAt).toLocaleDateString('id-ID')} {' '}
                  {new Date(completedTransaksi.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Kasir: {session.namaLengkap || session.username}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <tbody>
                  {completedTransaksi.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                        <div>{item.namaMenu}</div>
                        <div style={{ color: '#555', fontSize: '9px' }}>{item.qty} x {item.hargaSatuan.toLocaleString('id-ID')}</div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'bottom', padding: '2px 0' }}>Rp {item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '1px solid #000', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                <span>TOTAL</span>
                <span>Rp {completedTransaksi.total.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
              <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>
                *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={handleNewOrder} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Pesanan Baru
              </button>
              <button type="button" id="btn-cetak-struk" onClick={handlePrintReceipt} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                <Printer size={16} /> Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY THERMAL RECEIPT */}
      {completedTransaksi && (
        <div className="print-only print-receipt">
          <div className="print-header">
            <h2>{session.warungNama}</h2>
            <p>Cabang: {session.warungKode}</p>
          </div>
          <div className="print-divider" />
          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>No: #{completedTransaksi.id.slice(0, 8).toUpperCase()}</span>
            <span>{completedTransaksi.nomorMeja}</span>
          </div>
          <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {new Date(completedTransaksi.createdAt).toLocaleDateString('id-ID')} {' '}
              {new Date(completedTransaksi.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>Kasir: {session.namaLengkap || session.username}</span>
          </div>
          <div className="print-divider" />
          <table className="print-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {completedTransaksi.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div>{item.namaMenu}</div>
                    <div style={{ fontSize: '9px' }}>{item.qty} x {item.hargaSatuan.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="text-right" style={{ verticalAlign: 'bottom' }}>{item.subtotal.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-total">
            <div className="print-total-row grand">
              <span>TOTAL</span>
              <span>Rp {completedTransaksi.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="print-divider" />
          <div className="print-footer">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Makanan Halal, Nikmat, & Segar</p>
          </div>
        </div>
      )}
    </div>
  )
}
