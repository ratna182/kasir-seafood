/**
 * Salin semua data public schema dari Neon (Kranggan) ke Supabase (project sendiri).
 * Aman: backup data Supabase ke .backup/ dulu, lalu truncate + import dalam SATU transaksi.
 *
 * Jalankan:
 *   node scripts/migrate-neon-to-supabase.mjs        (minta konfirmasi)
 *   node scripts/migrate-neon-to-supabase.mjs --yes  (tanpa konfirmasi)
 */

import pg from 'pg'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const env = {}
  readFileSync(resolve(__dir, '..', '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^([A-Za-z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  })
  return env
}

const env = loadEnv()
if (!env.NEON_URL) { console.error('NEON_URL tidak ada di .env'); process.exit(1) }
if (!env.DIRECT_URL) { console.error('DIRECT_URL tidak ada di .env'); process.exit(1) }

// Parent dulu (insert), child dulu (truncate)
const TABLES = [
  ['warungs', 'created_at'],
  ['menu_categories', 'created_at'],
  ['users', 'created_at'],
  ['menus', 'created_at'],
  ['warung_menus', 'created_at'],
  ['kasir_shifts', 'created_at'],
  ['transaksis', 'created_at'],
  ['transaksi_items', 'created_at'],
  ['kasir_sesis', 'ditutup_pada'],
  ['kasir_shift_events', 'created_at'],
  ['activity_logs', 'created_at'],
]
const CHUNK = 500

const client = (url) => new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000,
  statement_timeout: 300000,
})

async function connectWithRetry(url, label, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const c = client(url)
    try { await c.connect(); return c }
    catch (e) {
      await c.end().catch(() => {})
      if (i === attempts) throw new Error(`${label} gagal konek: ${e.message}`)
      console.log(`  ${label} timeout, coba lagi (${i}/${attempts})…`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

async function confirm(question) {
  if (process.argv.includes('--yes')) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(r => rl.question(question, r))
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

async function main() {
  console.log('\n1/4 Baca data dari Neon…')
  const neon = await connectWithRetry(env.NEON_URL, 'Neon')
  const data = {}
  for (const [tbl, order] of TABLES) {
    const { rows } = await neon.query(`SELECT * FROM ${tbl} ORDER BY ${order}`)
    data[tbl] = rows
    console.log(`  ${tbl}: ${rows.length} baris`)
  }
  await neon.end()

  console.log('\n2/4 Baca data Supabase saat ini…')
  const supa = await connectWithRetry(env.DIRECT_URL, 'Supabase')
  const current = {}
  for (const [tbl] of TABLES) current[tbl] = (await supa.query(`SELECT * FROM ${tbl}`)).rows

  mkdirSync(resolve(__dir, '..', '.backup'), { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = resolve(__dir, '..', '.backup', `supabase-${stamp}.json`)
  writeFileSync(backupPath, JSON.stringify(current))
  console.log(`  Backup: ${backupPath}`)

  if (!await confirm(`\nData Supabase akan DIGANTI dengan data Neon. Lanjut? [y/N] `)) {
    console.log('Dibatalkan.')
    await supa.end()
    return
  }

  console.log('\n3/4 Truncate + import (satu transaksi)…')
  await supa.query('BEGIN')
  try {
    for (const [tbl] of [...TABLES].reverse()) {
      await supa.query(`TRUNCATE TABLE ${tbl} CASCADE`)
    }

    for (const [tbl] of TABLES) {
      const rows = data[tbl]
      if (!rows.length) { console.log(`  ${tbl}: kosong, dilewati`); continue }
      const cols = Object.keys(rows[0])
      const colSql = cols.map(c => `"${c}"`).join(', ')

      for (let i = 0; i < rows.length; i += CHUNK) {
        const params = []
        const tuples = rows.slice(i, i + CHUNK).map(row =>
          '(' + cols.map(c => { params.push(row[c]); return `$${params.length}` }).join(', ') + ')'
        )
        await supa.query(`INSERT INTO ${tbl} (${colSql}) VALUES ${tuples.join(', ')}`, params)
      }
      console.log(`  ${tbl}: ${rows.length} baris`)
    }
    await supa.query('COMMIT')
  } catch (e) {
    await supa.query('ROLLBACK')
    await supa.end()
    throw new Error(`Import gagal, Supabase tidak berubah: ${e.message}`)
  }

  console.log('\n4/4 Verifikasi jumlah baris…')
  let ok = true
  for (const [tbl] of TABLES) {
    const { rows } = await supa.query(`SELECT count(*)::int n FROM ${tbl}`)
    const match = rows[0].n === data[tbl].length
    if (!match) ok = false
    console.log(`  ${match ? 'OK  ' : 'BEDA'} ${tbl}: ${rows[0].n} / ${data[tbl].length}`)
  }
  await supa.end()

  if (!ok) { console.error('\nJumlah baris tidak cocok.'); process.exit(1) }
  console.log('\nSelesai: data Neon sudah ada di Supabase.')
}

main().catch(err => { console.error(`\nError: ${err.message}`); process.exit(1) })
