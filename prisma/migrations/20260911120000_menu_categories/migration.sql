-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "warung_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_warung_id_nama_key" ON "menu_categories"("warung_id", "nama");

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "warungs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn: category_id (nullable first)
ALTER TABLE "menus" ADD COLUMN "category_id" TEXT;

-- AddColumn: sort_order
ALTER TABLE "menus" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex for new sort_order
CREATE INDEX "menus_warung_id_category_id_sort_order_idx" ON "menus"("warung_id", "category_id", "sort_order");

-- DropColumn: kategori
ALTER TABLE "menus" DROP COLUMN "kategori";

-- DropEnum
DROP TYPE "KategoriMenu";
