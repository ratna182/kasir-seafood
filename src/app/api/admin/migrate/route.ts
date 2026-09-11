import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireRole } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const context = getAuthContext(request)
    const authError = requireRole(context, 'OWNER')
    if (authError) return authError

    const results: string[] = []

    // Step 1: Create menu_categories table if not exists
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "menu_categories" (
          "id" TEXT NOT NULL,
          "warung_id" TEXT NOT NULL,
          "nama" TEXT NOT NULL,
          "sort_order" INTEGER NOT NULL DEFAULT 0,
          "is_aktif" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('menu_categories table: OK')
    } catch (e: any) {
      results.push(`menu_categories table: ${e.message}`)
    }

    // Step 2: Create unique index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "menu_categories_warung_id_nama_key" ON "menu_categories"("warung_id", "nama")
      `)
      results.push('unique index: OK')
    } catch (e: any) {
      results.push(`unique index: ${e.message}`)
    }

    // Step 3: Add foreign key if not exists
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_warung_id_fkey"
          FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
      `)
      results.push('foreign key: OK')
    } catch (e: any) {
      results.push(`foreign key: ${e.message}`)
    }

    // Step 4: Add category_id column if missing
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ADD COLUMN "category_id" TEXT;
        EXCEPTION WHEN duplicate_column THEN null;
        END $$
      `)
      results.push('category_id column: OK')
    } catch (e: any) {
      results.push(`category_id column: ${e.message}`)
    }

    // Step 5: Add sort_order column if missing
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN null;
        END $$
      `)
      results.push('sort_order column: OK')
    } catch (e: any) {
      results.push(`sort_order column: ${e.message}`)
    }

    // Step 6: Insert default "Lainnya" category for each warung
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "menu_categories" ("id", "warung_id", "nama", "sort_order", "is_aktif", "created_at")
        SELECT gen_random_uuid(), "id", 'Lainnya', 0, true, NOW()
        FROM "warungs"
        ON CONFLICT ("warung_id", "nama") DO NOTHING
      `)
      results.push('default categories: OK')
    } catch (e: any) {
      results.push(`default categories: ${e.message}`)
    }

    // Step 7: Assign menus without category to "Lainnya"
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "menus" SET "category_id" = (
          SELECT "id" FROM "menu_categories"
          WHERE "menu_categories"."warung_id" = "menus"."warung_id"
            AND "menu_categories"."nama" = 'Lainnya'
          LIMIT 1
        ) WHERE "category_id" IS NULL
      `)
      results.push('assign menus to Lainnya: OK')
    } catch (e: any) {
      results.push(`assign menus: ${e.message}`)
    }

    // Step 8: Make category_id NOT NULL
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" ALTER COLUMN "category_id" SET NOT NULL;
        EXCEPTION WHEN others THEN null;
        END $$
      `)
      results.push('category_id NOT NULL: OK')
    } catch (e: any) {
      results.push(`category_id NOT NULL: ${e.message}`)
    }

    // Step 9: Drop old kategori column if exists
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "menus" DROP COLUMN "kategori";
        EXCEPTION WHEN undefined_column THEN null;
        END $$
      `)
      results.push('drop kategori: OK')
    } catch (e: any) {
      results.push(`drop kategori: ${e.message}`)
    }

    // Step 10: Drop old enum if exists
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          DROP TYPE "KategoriMenu";
        EXCEPTION WHEN undefined_object THEN null;
        END $$
      `)
      results.push('drop KategoriMenu enum: OK')
    } catch (e: any) {
      results.push(`drop enum: ${e.message}`)
    }

    // Step 11: Add index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "menus_warung_id_category_id_sort_order_idx" ON "menus"("warung_id", "category_id", "sort_order")
      `)
      results.push('sort index: OK')
    } catch (e: any) {
      results.push(`sort index: ${e.message}`)
    }

    // Verify
    const catCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menu_categories"`
    const menuCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menus" WHERE "category_id" IS NOT NULL`
    const menuTotal = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "menus"`

    return NextResponse.json({
      success: true,
      steps: results,
      verification: {
        categories: (catCount as any[])[0].count,
        menusWithCategory: (menuCount as any[])[0].count,
        totalMenus: (menuTotal as any[])[0].count,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/admin/migrate]', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
