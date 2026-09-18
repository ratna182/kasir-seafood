'use client'

import { useState } from 'react'
import { Search, Clock } from 'lucide-react'

interface RekapItem {
  namaMenu: string
  kategori: string
  qtyTotal: number
  pendapatanTotal: number
}

interface TransaksiItem {
  nomorMeja: string
  total: number
  metodePembayaran: string
  createdAt: string
}

interface KasirSesi {
  id: string
  tanggal: string
  ditutupPada: string
  dibukaKembaliPada: string | null
  ditutupOleh: string
  totalTransaksi: number
  totalPendapatan: number
  warungNama: string
  warungKode: string
  warungAlamat: string | null
  detail: {
    rekap: RekapItem[]
    transaksi: TransaksiItem[]
    grandTotalQty: number
    totalCash: number
    totalQRIS: number
    totalTransfer: number
    jumlahTransaksi: number
  }
}

interface RiwayatClientProps {
  session: { warungKode: string | null; role: string }
  initialKasirSesis: KasirSesi[]
  initialStartDate?: string
  initialEndDate?: string
}

export default function RiwayatClient({ session, initialKasirSesis, initialStartDate, initialEndDate }: RiwayatClientProps) {
  const [kasirSesis] = useState<KasirSesi[]>(initialKasirSesis)
  const [search, setSearch] = useState('')

  const filtered = kasirSesis.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.warungKode.toLowerCase().includes(q) || s.ditutupOleh.toLowerCase().includes(q) || s.tanggal.includes(q)
  })

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Riwayat Laporan Harian</h1>
          <p className="text-secondary text-sm">{kasirSesis.length} sesi kasir • {session.role === 'OWNER' ? 'Semua cabang' : `Cabang: ${session.warungKode}`}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" name="mulai" aria-label="Tanggal mulai" defaultValue={initialStartDate} className="form-input" />
            <span className="text-secondary text-sm">sampai</span>
            <input type="date" name="sampai" aria-label="Tanggal akhir" defaultValue={initialEndDate} className="form-input" />
            <button type="submit" className="btn btn-ghost btn-sm">Filter tanggal</button>
            {(initialStartDate || initialEndDate) && <a href="/riwayat" className="btn btn-ghost btn-sm">Semua waktu</a>}
          </form>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari kasir atau tanggal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      <div className="no-print">
        {kasirSesis.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <h3>Belum Ada Sesi Kasir</h3>
            <p className="text-secondary text-sm">Riwayat laporan kasir (buka/tutup) akan muncul di sini.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <p className="text-secondary">Tidak ada sesi kasir yang cocok dengan &quot;{search}&quot;.</p>
            <button onClick={() => setSearch('')} className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>Reset Pencarian</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {filtered.map((sesi) => (
              <LaporanCard key={sesi.id} sesi={sesi} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LaporanCard({ sesi }: { sesi: KasirSesi }) {
  const [expanded, setExpanded] = useState(false)
  const d = sesi.detail
  const tanggal = new Date(sesi.tanggal + 'T00:00:00')
  const tanggalStr = tanggal.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const bukaStr = sesi.dibukaKembaliPada
    ? new Date(sesi.dibukaKembaliPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '-'
  const tutupStr = new Date(sesi.ditutupPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header card — collapsed */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', textAlign: 'left', background: 'none', border: 'none', borderBottom: expanded ? '1px solid var(--color-border)' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tanggalStr}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Buka {bukaStr} → Tutup {tutupStr} • {sesi.ditutupOleh}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.jumlahTransaksi} transaksi</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
            Rp {sesi.totalPendapatan.toLocaleString('id-ID')}
          </div>
        </div>
      </button>

      {/* Expanded — format persis seperti cetak laporan */}
      {expanded && (
        <div style={{ padding: '1.25rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>LAPORAN PENJUALAN HARIAN</div>
          </div>

          <div style={{ borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)', padding: '0.5rem 0', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <div>Tanggal: {sesi.tanggal}</div>
            <div>Cabang: {sesi.warungNama}</div>
            <div>Status: SUDAH DITUTUP</div>
            <div>Pkl: {tutupStr}</div>
          </div>

          {/* RINGKASAN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-brand)', fontFamily: "var(--font-fraunces), serif" }}>{d.jumlahTransaksi}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Transaksi</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: "var(--font-fraunces), serif" }}>{d.grandTotalQty}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Porsi</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>Rp {sesi.totalPendapatan.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Pendapatan</div>
            </div>
          </div>

          {/* PAYMENT METHOD CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ textAlign: 'center', padding: '0.4rem', borderLeft: '3px solid var(--color-success)', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif" }}>Rp {d.totalCash.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Cash</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.4rem', borderLeft: '3px solid var(--color-warning)', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: "var(--font-fraunces), serif" }}>Rp {d.totalQRIS.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>QRIS</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.4rem', borderLeft: '3px solid var(--color-info)', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-info)', fontFamily: "var(--font-fraunces), serif" }}>Rp {d.totalTransfer.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Transfer</div>
            </div>
          </div>

          {/* DAFTAR TRANSAKSI */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', marginBottom: '2px' }}>DAFTAR TRANSAKSI</div>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.2rem 0', textAlign: 'left' }}>MEJA</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'left' }}>WAKTU</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'left' }}>METODE</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {d.transaksi.map((tx, i) => (
                  <tr key={i}>
                    <td style={{ padding: '0.15rem 0' }}>{tx.nomorMeja}</td>
                    <td style={{ padding: '0.15rem 0' }}>{new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '0.15rem 0' }}>{tx.metodePembayaran === 'QRIS' ? 'QRIS' : tx.metodePembayaran === 'TRANSFER' ? 'TRSF' : 'CASH'}</td>
                    <td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{tx.total.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
          </div>

          {/* DETAIL KASIR */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', marginBottom: '2px' }}>DETAIL KASIR</div>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <tbody>
                <tr><td style={{ padding: '0.15rem 0', fontWeight: 700 }}>Buka Kasir</td><td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{bukaStr}</td></tr>
                <tr><td style={{ padding: '0.15rem 0', fontWeight: 700 }}>Tutup Kasir</td><td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{tutupStr}</td></tr>
              </tbody>
            </table>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
          </div>

          {/* REKAP MENU */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', marginBottom: '2px' }}>REKAP MENU</div>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.2rem 0', textAlign: 'left' }}>MENU</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'center' }}>KATEGORI</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'right' }}>QTY</th>
                  <th style={{ padding: '0.2rem 0', textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {d.rekap.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '0.15rem 0' }}>{item.namaMenu}</td>
                    <td style={{ padding: '0.15rem 0', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: item.kategori === 'MAKANAN' ? 'var(--color-brand-light)' : 'var(--color-success-light)', color: item.kategori === 'MAKANAN' ? 'var(--color-brand)' : 'var(--color-success)' }}>
                        {item.kategori === 'MAKANAN' ? 'Makanan' : 'Minuman'}
                      </span>
                    </td>
                    <td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{item.qtyTotal}</td>
                    <td style={{ padding: '0.15rem 0', textAlign: 'right' }}>{item.pendapatanTotal.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
          </div>

          {/* TOTAL PER METODE BAYAR */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', marginBottom: '2px' }}>TOTAL PER METODE BAYAR</div>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}><span>CASH</span><span>Rp {d.totalCash.toLocaleString('id-ID')}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}><span>QRIS</span><span>Rp {d.totalQRIS.toLocaleString('id-ID')}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}><span>TRANSFER</span><span>Rp {d.totalTransfer.toLocaleString('id-ID')}</span></div>
            <div style={{ borderTop: '1px dashed var(--color-border)' }} />
          </div>

          {/* GRAND TOTAL */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}><span>Total Qty:</span><span>{d.grandTotalQty} item</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.15rem 0' }}><span>Total Transaksi:</span><span>{d.jumlahTransaksi} transaksi</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.3rem 0', borderTop: '1px solid var(--color-border)', marginTop: '0.25rem' }}>
              <span>GRAND TOTAL:</span>
              <span style={{ color: 'var(--color-success)', fontFamily: "var(--font-fraunces), serif", fontVariantNumeric: 'tabular-nums' }}>
                Rp {sesi.totalPendapatan.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--color-border)', marginTop: '0.5rem', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            *** REKAPITULASI RESMI ***<br />Kasir Vian Jaya 08
          </div>
        </div>
      )}
    </div>
  )
}
