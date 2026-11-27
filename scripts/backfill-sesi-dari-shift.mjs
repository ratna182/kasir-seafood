/**
 * Jembatan data: kasir_shifts (dipakai aplikasi baru, 28 Okt–22 Nov) -> kasir_sesis
 * yang dibaca halaman Riwayat di repo ini. Juga isi kasir_id NULL pada transaksi lama.
 * Idempotent: upsert kasir_sesis berdasarkan id shift / id jembatan yang stabil.
 *
 * node scripts/backfill-sesi-dari-shift.mjs          (lihat rencana)
 * node scripts/backfill-sesi-dari-shift.mjs --yes    (jalankan)
 */

import pg from 'pg'
import fs from 'fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envText = fs.readFileSync(resolve(__dir, '..', '.env'), 'utf8')
const m = envText.match(/^DIRECT_URL="?([^"\r\n]*)/m)
if (!m) { console.error('DIRECT_URL tidak ada'); process.exit(1) }

const c = new pg.Client({ connectionString: m[1], ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 90000 })
await c.connect()

const WIB = 7 * 60 * 60 * 1000
const dateKey = d => new Date(d.getTime() + WIB).toISOString().slice(0, 10)
const dayStart = key => new Date(Date.parse(key + 'T00:00:00Z') - WIB)
const stableId = seed => {
  const h = createHash('sha256').update(seed).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const warungs = (await c.query('select id, kode, nama from warungs order by kode')).rows
const apply = process.argv.includes('--yes')

let totalInsert = 0
let totalBackfillKasir = 0

for (const w of warungs) {
  const shifts = (await c.query(`select id, ditutup_oleh, dibuka_pada, ditutup_pada from kasir_shifts
    where warung_id=$1 and status='DITUTUP' and ditutup_pada is not null and ditutup_oleh is not null
    order by dibuka_pada`, [w.id])).rows

  const plans = []
  for (const s of shifts) {
    const key = dateKey(s.dibuka_pada ?? s.ditutup_pada)
    const start = dayStart(key)
    const { rows: tx } = await c.query(`select coalesce(sum(total),0)::int total, count(*)::int n
      from transaksis where warung_id=$1 and status='SELESAI' and kasir_id=$2 and created_at between $3 and $4`,
      [w.id, s.ditutup_oleh, start, s.ditutup_pada])
    plans.push({ id: s.id, bukaPada: s.dibuka_pada, key, ditutupOleh: s.ditutup_oleh, ditutupPada: s.ditutup_pada, n: tx[0].n, total: tx[0].total })
  }

  const nullKasir = (await c.query(`select count(*)::int n from transaksis where warung_id=$1 and status='SELESAI' and kasir_id is null`, [w.id])).rows[0].n
  const kasir = (await c.query(`select kasir_id id from transaksis where warung_id=$1 and kasir_id is not null group by 1 order by count(*) desc limit 1`, [w.id])).rows[0]

  console.log(`\n${w.kode} ${w.nama}`)
  console.log(`  shift DITUTUP: ${shifts.length} | sesi dengan transaksi: ${plans.filter(p => p.n || p.total).length}`)
  console.log('  contoh awal :', plans.slice(0, 2).map(p => `${p.key} ${p.n}tx/Rp${p.total}`).join(' | '))
  console.log('  contoh akhir:', plans.slice(-2).map(p => `${p.key} ${p.n}tx/Rp${p.total}`).join(' | '))
  console.log(`  transaksi SELESAI kasir_id NULL: ${nullKasir} (diisi -> ${kasir?.id ?? 'tidak ada kasir'})`)

  if (!apply) continue

  const shiftIds = plans.map((p) => p.id)
  const bridgeIds = plans.map((p) => stableId(`bridge:${p.id}`))
  await c.query(`delete from kasir_sesis where id = any($1::text[])`, [bridgeIds])
  await c.query(`update kasir_sesis set dibuka_kembali_pada=null where id = any($1::text[])`, [shiftIds])

  for (const p of plans) {
    await c.query(`insert into kasir_sesis (id, warung_id, tanggal, ditutup_oleh, ditutup_pada, total_transaksi, total_pendapatan)
      values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do update
      set total_transaksi=excluded.total_transaksi, total_pendapatan=excluded.total_pendapatan`,
      [p.id, w.id, p.key, p.ditutupOleh, p.ditutupPada, p.n, p.total])
    totalInsert++

    await c.query(`update kasir_sesis set dibuka_kembali_pada=$1
      where id=(
        select id from kasir_sesis
        where warung_id=$2 and ditutup_oleh=$3 and tanggal=$4 and ditutup_pada < $5 and id <> $6
        order by ditutup_pada desc limit 1
      ) and dibuka_kembali_pada is distinct from $1`,
      [p.bukaPada, w.id, p.ditutupOleh, p.key, p.ditutupPada, p.id])

    const overnight = await c.query(`select id from kasir_sesis
      where warung_id=$1 and ditutup_oleh=$2 and tanggal < $3 and ditutup_pada > $4
      and extract(epoch from (ditutup_pada - $4)) > 21600 and ditutup_pada < $5
      order by ditutup_pada desc limit 1`,
      [w.id, p.ditutupOleh, p.key, dayStart(p.key), p.ditutupPada])
    if (overnight.rowCount) {
      await c.query(`insert into kasir_sesis (id, warung_id, tanggal, ditutup_oleh, ditutup_pada, dibuka_kembali_pada, total_transaksi, total_pendapatan)
        values ($1,$2,$3,$4,$5,$6,0,0)
        on conflict (id) do update set ditutup_pada=excluded.ditutup_pada, dibuka_kembali_pada=excluded.dibuka_kembali_pada`,
        [bridgeIds[plans.indexOf(p)], w.id, p.key, p.ditutupOleh, new Date(p.ditutupPada.getTime() - 1), p.bukaPada])
      totalInsert++
    }
  }
  if (kasir && nullKasir) {
    const r = await c.query(`update transaksis set kasir_id=$1 where warung_id=$2 and status='SELESAI' and kasir_id is null`, [kasir.id, w.id])
    totalBackfillKasir += r.rowCount
  }
}

if (!apply) console.log('\nDry run. Tambahkan --yes untuk menjalankan.')
else console.log(`\nSelesai: ${totalInsert} sesi diproses, ${totalBackfillKasir} transaksi diberi kasir_id.`)

await c.end()
