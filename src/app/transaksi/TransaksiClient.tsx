'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, X, Minus, Plus, Printer, CreditCard, Banknote, CheckCircle, Trash2, Pencil } from 'lucide-react'
import Receipt, { type PrinterWidth, type ReceiptTransaction } from '@/components/Receipt'
import PrinterSetup from '@/components/PrinterSetup'
import PrinterStatusBadge from '@/components/PrinterStatus'
import { printer } from '@/lib/printer/bluetooth'
import { loadPrinterConfig } from '@/lib/printer/storage'
import { encodeReceipt } from '@/lib/printer/receipt-encoder'
import type { PrinterConfig } from '@/lib/printer/types'

interface Menu {
  id: string
  nama: string
  harga: number
  isAktif: boolean
  categoryId: string
  category: { id: string; nama: string }
}

interface CartItem {
  menuId: string
  nama: string
  harga: number
  qty: number
  hargaSementara?: number
  diskonSatuan: number
  catatan: string
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
    diskonSatuan?: number
    catatan?: string | null
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

export default function TransaksiClient({ session, menus: initialMenus, initialActiveOrders, isKasirClosed }: TransaksiClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [nomorMeja, setNomorMeja] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
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
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>('80mm')
  const [menus, setMenus] = useState<Menu[]>(initialMenus)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null)
  const [showPrinterSetup, setShowPrinterSetup] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const saved = loadPrinterConfig()
    if (saved) {
      setPrinterConfig(saved)
      setPrinterWidth(saved.width)
      printer.autoReconnect()
    }
  }, [])

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchesSearch = menu.nama.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !activeCategoryId || menu.categoryId === activeCategoryId
      return matchesSearch && matchesCategory
    })
  }, [menus, search, activeCategoryId])

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; nama: string; count: number }>()
    for (const menu of menus) {
      if (!menu.isAktif) continue
      const existing = seen.get(menu.categoryId)
      if (existing) existing.count++
      else seen.set(menu.categoryId, { id: menu.categoryId, nama: menu.category.nama, count: 1 })
    }
    return Array.from(seen.values())
  }, [menus])

  const menusByCategory = useMemo(() => {
    const grouped = new Map<string, Menu[]>()
    for (const menu of filteredMenus) {
      const list = grouped.get(menu.categoryId) || []
      list.push(menu)
      grouped.set(menu.categoryId, list)
    }
    return grouped
  }, [filteredMenus])

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
    const existing = cart.find((item) => item.menuId === menu.id)
    setEditingCartItem(existing ? { ...existing, qty: existing.qty + 1 } : { menuId: menu.id, nama: menu.nama, harga: menu.harga, qty: 1, diskonSatuan: 0, catatan: '' })
    setCart((prev) => {
      const current = prev.find((item) => item.menuId === menu.id)
      if (current) {
        return prev.map((item) =>
          item.menuId === menu.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { menuId: menu.id, nama: menu.nama, harga: menu.harga, qty: 1, diskonSatuan: 0, catatan: '' }]
    })
  }

  function itemUnitPrice(item: CartItem) { return Math.max(0, (item.hargaSementara ?? item.harga) - item.diskonSatuan) }

  function saveCartItemEdit() {
    if (!editingCartItem) return
    if (editingCartItem.diskonSatuan > (editingCartItem.hargaSementara ?? editingCartItem.harga)) {
      setError('Diskon tidak boleh melebihi harga satuan.'); return
    }
    setCart((prev) => prev.map((item) => item.menuId === editingCartItem.menuId ? editingCartItem : item))
    setEditingCartItem(null)
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

  const grandTotal = useMemo(() => cart.reduce((sum, item) => sum + itemUnitPrice(item) * item.qty, 0), [cart])
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
          items: cart.map((item) => ({ menuId: item.menuId, qty: item.qty, hargaSatuan: item.hargaSementara ?? item.harga, diskonSatuan: item.diskonSatuan, catatan: item.catatan })),
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

  async function handlePrintReceipt() {
    if (completedTransaksi) {
      setPrinting(true)
      try {
        // Open print window - small window to match thermal paper
        const printWindow = window.open('', '_blank', 'width=280,height=500')
        if (printWindow) {
          const receiptEl = document.querySelector('.print-receipt')
          const receiptHTML = receiptEl ? receiptEl.outerHTML : ''
          
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Cetak Struk</title>
              <style>
                @page { 
                  size: 72mm auto; 
                  margin: 0;
                }
                * { 
                  box-sizing: border-box; 
                  margin: 0; 
                  padding: 0; 
                }
                html { 
                  width: 72mm; 
                }
                body { 
                  width: 72mm; 
                  margin: 0; 
                  padding: 0;
                  font-family: 'Helvetica', 'Arial', sans-serif; 
                  font-size: 20px; 
                  font-weight: bold; 
                  color: black; 
                  background: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-receipt {
                  width: 72mm;
                  padding: 2mm;
                  text-align: center;
                }
                .print-header { text-align: center; margin-bottom: 6px; }
                .print-header h2 { font-size: 22px; text-transform: uppercase; margin: 0 0 2px; }
                .print-header p { font-size: 16px; margin: 0; }
                .print-divider { border: none; border-top: 1px dashed black; margin: 4px 0; }
                .receipt-meta { display: flex; justify-content: center; gap: 0.5rem; font-size: 16px; }
                .receipt-table { width: 100%; border-collapse: collapse; }
                .receipt-table td { padding: 2px 0; vertical-align: top; }
                .receipt-item { display: flex; justify-content: space-between; }
                .receipt-item-name { font-weight: bold; }
                .receipt-item-price { font-weight: bold; }
                .receipt-item-detail { font-size: 16px; }
                .receipt-item-note { font-size: 14px; font-style: italic; }
                .receipt-summary { margin-top: 4px; }
                .receipt-total-row { display: flex; justify-content: space-between; font-size: 18px; padding: 2px 0; }
                .receipt-grand { font-size: 20px; }
                .receipt-grand-section { margin-top: 4px; }
                .print-footer { text-align: center; margin-top: 6px; font-size: 16px; }
                @media print {
                  body { width: 72mm; }
                  .print-receipt { width: 72mm; }
                }
              </style>
            </head>
            <body>
              ${receiptHTML}
            </body>
            </html>
          `)
          printWindow.document.close()
          
          // Focus and print
          printWindow.focus()
          setTimeout(() => {
            printWindow.print()
          }, 300)
        }
      } catch (e) {
        console.error('Print error:', e)
        setError(`Gagal mencetak: ${e instanceof Error ? e.message : 'Unknown error'}`)
      } finally {
        setPrinting(false)
      }
    }
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Meja Aktif</h2>
          <button onClick={() => window.location.reload()} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
            Refresh
          </button>
        </div>
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
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { setActiveCategoryId(null); document.getElementById('menu-list')?.scrollIntoView({ behavior: 'smooth' }) }}
                className={`btn btn-sm ${activeCategoryId === null ? 'btn-primary' : 'btn-ghost'}`}>
                Semua ({menus.filter((m) => m.isAktif).length})
              </button>
              {categories.map((cat) => (
                <button key={cat.id} type="button"
                  onClick={() => { setActiveCategoryId(cat.id); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' }) }}
                  className={`btn btn-sm ${activeCategoryId === cat.id ? 'btn-primary' : 'btn-ghost'}`}>
                  {cat.nama} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          <div id="menu-list">
          {filteredMenus.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <ShoppingCart size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
              {menus.length === 0 ? (
                <>
                  <p className="text-secondary" style={{ marginBottom: '0.75rem' }}>Belum ada menu. Minta owner sync menu dulu.</p>
                  <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">Refresh Halaman</button>
                </>
              ) : (
                <p className="text-secondary">Tidak ada menu yang cocok dengan filter saat ini.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Array.from(menusByCategory.entries()).map(([catId, catMenus]) => (
                <div key={catId} id={`cat-${catId}`}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>
                    {catMenus[0]?.category.nama}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {catMenus.map((menu) => {
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
                            background: inCart ? 'var(--color-brand-soft)' : 'var(--color-surface)',
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
                          <div style={{
                            fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)',
                            lineHeight: '1.3', marginBottom: '0.5rem',
                          }}>
                            {menu.nama}
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
                </div>
              ))}
            </div>
          )}
          </div>
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
                      <button type="button" className="btn btn-ghost btn-sm qty-stepper" onClick={() => item.id && handleUpdateSavedItem(item.id, item.qty - 1)}><Minus size={14} /></button>
                      <strong>{item.qty}</strong>
                      <button type="button" className="btn btn-ghost btn-sm qty-stepper" onClick={() => item.id && handleUpdateSavedItem(item.id, item.qty + 1)}><Plus size={14} /></button>
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
                        Rp {itemUnitPrice(item).toLocaleString('id-ID')}{item.diskonSatuan > 0 && ` (diskon Rp ${item.diskonSatuan.toLocaleString('id-ID')})`}
                      </div>
                      {item.catatan && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.catatan}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button type="button" onClick={() => updateQty(item.menuId, -1)} className="btn btn-ghost btn-sm qty-stepper">
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                        {item.qty}
                      </span>
                      <button type="button" onClick={() => updateQty(item.menuId, 1)} className="btn btn-ghost btn-sm qty-stepper">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        Rp {(itemUnitPrice(item) * item.qty).toLocaleString('id-ID')}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button type="button" onClick={() => setEditingCartItem(item)} style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', padding: 0 }} title="Atur harga, diskon, atau catatan"><Pencil size={13} /></button>
                        <button type="button" onClick={() => removeFromCart(item.menuId)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Hapus</button>
                      </div>
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
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
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

      {editingCartItem && (
        <div className="modal-overlay no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(51, 51, 51, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }} onClick={(event) => { if (event.target === event.currentTarget) setEditingCartItem(null) }}>
          <div className="item-edit-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'inherit', fontSize: '1.15rem', margin: 0 }}>EDIT PESANAN</h2>
              <button type="button" onClick={() => setEditingCartItem(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}><X size={18} /></button>
            </div>
            <div className="item-edit-summary"><div className="item-edit-avatar">{editingCartItem.nama.slice(0, 2).toUpperCase()}</div><div style={{ flex: 1 }}><strong>{editingCartItem.nama}</strong><p>Harga menu: Rp {editingCartItem.harga.toLocaleString('id-ID')}</p></div><strong>Rp {(itemUnitPrice(editingCartItem) * editingCartItem.qty).toLocaleString('id-ID')}</strong></div>
            <div className="item-edit-stepper"><button type="button" onClick={() => setEditingCartItem({ ...editingCartItem, qty: Math.max(1, editingCartItem.qty - 1) })}>−</button><strong>{editingCartItem.qty}</strong><button type="button" onClick={() => setEditingCartItem({ ...editingCartItem, qty: editingCartItem.qty + 1 })}>+</button></div>
            <label className="item-edit-option"><input type="checkbox" checked={editingCartItem.hargaSementara !== undefined} onChange={(event) => setEditingCartItem({ ...editingCartItem, hargaSementara: event.target.checked ? editingCartItem.harga : undefined })} /> Ubah harga sementara</label>
            {editingCartItem.hargaSementara !== undefined && <input type="number" min="0" step="500" className="form-input" value={editingCartItem.hargaSementara} onChange={(event) => setEditingCartItem({ ...editingCartItem, hargaSementara: Number(event.target.value) })} aria-label="Harga sementara" />}
            <label className="item-edit-option"><input type="checkbox" checked={editingCartItem.diskonSatuan > 0} onChange={(event) => setEditingCartItem({ ...editingCartItem, diskonSatuan: event.target.checked ? 500 : 0 })} /> Ubah diskon per jumlah</label>
            {editingCartItem.diskonSatuan > 0 && <input type="number" min="0" step="500" className="form-input" value={editingCartItem.diskonSatuan} onChange={(event) => setEditingCartItem({ ...editingCartItem, diskonSatuan: Number(event.target.value) })} aria-label="Diskon per jumlah" />}
            <label className="item-edit-option"><input type="checkbox" checked={Boolean(editingCartItem.catatan)} onChange={(event) => setEditingCartItem({ ...editingCartItem, catatan: event.target.checked ? ' ' : '' })} /> Tambah catatan singkat</label>
            {editingCartItem.catatan && <input type="text" maxLength={160} className="form-input" placeholder="Contoh: pilih yang besar" value={editingCartItem.catatan} onChange={(event) => setEditingCartItem({ ...editingCartItem, catatan: event.target.value })} />}
            <button type="button" onClick={saveCartItemEdit} className="btn btn-primary item-edit-save">SIMPAN</button>
          </div>
        </div>
      )}

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

            <Receipt transaction={completedTransaksi} cashier={session.namaLengkap || session.username} warungNama={session.warungNama} width={printerWidth} preview />
            <div className="receipt-width-picker">
              <span>Ukuran printer</span>
              {(['58mm', '80mm'] as const).map((width) => <button key={width} type="button" onClick={() => setPrinterWidth(width)} className={`btn btn-sm ${printerWidth === width ? 'btn-primary' : 'btn-ghost'}`}>{width}</button>)}
              <PrinterStatusBadge onSetupClick={() => setShowPrinterSetup(true)} />
            </div>

            {/* Instruksi cetak untuk Android */}
            <div style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Cara cetak dari Android:</strong>
              <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0, lineHeight: 1.6 }}>
                <li>Klik <strong>Cetak Struk</strong></li>
                <li>Pilih printer <strong>Blueprint</strong></li>
                <li>Tap <strong>"Kertas"</strong> → pilih <strong>"Rol 58mm"</strong> atau <strong>"Rol 80mm"</strong> jika ada</li>
                <li>Jika tidak ada, pilih <strong>"Lainnya"</strong> → cari ukuran <strong>72mm</strong></li>
                <li>Jika tidak bisa pilih, langsung klik <strong>Print</strong> saja</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={handleNewOrder} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Pesanan Baru
              </button>
              <button type="button" id="btn-cetak-struk" onClick={handlePrintReceipt} disabled={printing} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                <Printer size={16} /> {printing ? 'Mencetak...' : 'Cetak Struk'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PrinterSetup open={showPrinterSetup} onClose={() => setShowPrinterSetup(false)} onConfigured={(config) => { setPrinterConfig(config); if (config) setPrinterWidth(config.width) }} />

      {completedTransaksi && <Receipt transaction={completedTransaksi} cashier={session.namaLengkap || session.username} warungNama={session.warungNama} width={printerWidth} />}
    </div>
  )
}
