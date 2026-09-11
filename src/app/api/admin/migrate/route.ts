import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    // Check if old schema or new schema
    const hasKategoriCol = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'kategori') as exists
    ` as any[]
    const hasCategoryCol = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'category_id') as exists
    ` as any[]
    const hasMenuCategoriesTable = await prisma.$queryRaw`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_categories') as exists
    ` as any[]

    // List all menus with possible duplicates
    const allMenus = await prisma.$queryRaw`
      SELECT m.id, m.nama, m.warung_id, m.isAktif, m.category_id, m.kategori
      FROM menus m
      ORDER BY m.warung_id, m.nama
    ` as any[]

    // Check for menus named Ayam Goreng
    const ayamGoreng = allMenus.filter((m: any) => m.nama?.toLowerCase().includes('ayam'))

    // Count categories
    let categories: any[] = []
    if (hasMenuCategoriesTable[0].exists) {
      categories = await prisma.$queryRaw`SELECT * FROM menu_categories ORDER BY sort_order` as any[]
    }

    return NextResponse.json({
      success: true,
      schema: {
        hasKategoriColumn: hasKategoriCol[0].exists,
        hasCategoryColumn: hasCategoryCol[0].exists,
        hasMenuCategoriesTable: hasMenuCategoriesTable[0].exists,
      },
      totalMenus: allMenus.length,
      ayamMenus: ayamGoreng,
      categories: categories.map((c: any) => ({ id: c.id, nama: c.nama, warung_id: c.warung_id, sortOrder: c.sort_order })),
    })
  } catch (error: any) {
    console.error('[GET /api/admin/migrate]', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
