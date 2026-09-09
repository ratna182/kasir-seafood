import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isOwner, requireWarungAccess } from '@/lib/auth'
import ExcelJS from 'exceljs'

// GET /api/laporan/export — export laporan ke Excel
// Query params: warung_id (required untuk owner), start_date, end_date
export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    if (!context) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const warungIdParam = searchParams.get('warung_id')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // Tentukan warung_id berdasarkan role
    let warungId: string
    if (isOwner(context)) {
      // Owner harus specify warung_id
      if (!warungIdParam) {
        return NextResponse.json({ success: false, message: 'warung_id wajib diisi untuk owner.' }, { status: 400 })
      }
      // Validasi akses warung
      const warungAccessError = requireWarungAccess(context, warungIdParam)
      if (warungAccessError) return warungAccessError
      warungId = warungIdParam
    } else {
      // Kasir hanya bisa lihat warungnya sendiri
      warungId = context.warungId ?? ''
      if (!warungId) {
        return NextResponse.json({ success: false, message: 'Kasir tidak terdaftar di warung.' }, { status: 403 })
      }
    }

    // Parse tanggal
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startDate = startDateParam ? new Date(startDateParam) : today
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = endDateParam ? new Date(endDateParam) : today
    endDate.setHours(23, 59, 59, 999)

    // Validasi tanggal
    if (startDate > endDate) {
      return NextResponse.json({ success: false, message: 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.' }, { status: 400 })
    }

    // Ambil info warung
    const warung = await prisma.warung.findUnique({
      where: { id: warungId },
      select: { nama: true, kode: true },
    })

    // Ambil semua transaksi SELESAI pada rentang tanggal
    const transaksis = await prisma.transaksi.findMany({
      where: {
        warungId,
        tanggal: { gte: startDate, lte: endDate },
        status: 'SELESAI',
      },
      include: { items: true },
      orderBy: { tanggal: 'asc' },
    })

    // Buat workbook Excel
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Kasir Vian Jaya 08'
    workbook.created = new Date()

    // Sheet 1: Rekap Harian
    const dailySheet = workbook.addWorksheet('Rekap Harian')
    
    // Header
    dailySheet.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Jumlah Transaksi', key: 'jumlahTransaksi', width: 20 },
      { header: 'Total Pendapatan', key: 'totalPendapatan', width: 20 },
    ]

    // Style header
    dailySheet.getRow(1).font = { bold: true }
    dailySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    dailySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Group transaksi by date
    const dailyData = new Map<string, { jumlahTransaksi: number; totalPendapatan: number }>()
    
    for (const transaksi of transaksis) {
      const dateKey = transaksi.tanggal.toISOString().split('T')[0]
      const existing = dailyData.get(dateKey)
      if (existing) {
        existing.jumlahTransaksi++
        existing.totalPendapatan += transaksi.total
      } else {
        dailyData.set(dateKey, {
          jumlahTransaksi: 1,
          totalPendapatan: transaksi.total,
        })
      }
    }

    // Add data rows
    for (const [tanggal, data] of dailyData) {
      dailySheet.addRow({
        tanggal,
        jumlahTransaksi: data.jumlahTransaksi,
        totalPendapatan: data.totalPendapatan,
      })
    }

    // Add total row
    const totalRow = dailySheet.addRow({
      tanggal: 'TOTAL',
      jumlahTransaksi: Array.from(dailyData.values()).reduce((sum, d) => sum + d.jumlahTransaksi, 0),
      totalPendapatan: Array.from(dailyData.values()).reduce((sum, d) => sum + d.totalPendapatan, 0),
    })
    totalRow.font = { bold: true }

    // Sheet 2: Detail Transaksi
    const detailSheet = workbook.addWorksheet('Detail Transaksi')
    
    detailSheet.columns = [
      { header: 'ID Transaksi', key: 'id', width: 36 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Meja', key: 'meja', width: 10 },
      { header: 'Menu', key: 'menu', width: 30 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Harga Satuan', key: 'harga', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Total Transaksi', key: 'totalTransaksi', width: 18 },
    ]

    // Style header
    detailSheet.getRow(1).font = { bold: true }
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Add data rows
    for (const transaksi of transaksis) {
      for (const item of transaksi.items) {
        detailSheet.addRow({
          id: transaksi.id,
          tanggal: transaksi.tanggal.toISOString().split('T')[0],
          meja: transaksi.nomorMeja,
          menu: item.namaMenu,
          qty: item.qty,
          harga: item.hargaSatuan,
          subtotal: item.subtotal,
          totalTransaksi: transaksi.total,
        })
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return file
    const filename = `laporan-${warung?.kode || 'all'}-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/laporan/export]', error)
    return NextResponse.json({ success: false, message: 'Gagal export laporan.' }, { status: 500 })
  }
}
