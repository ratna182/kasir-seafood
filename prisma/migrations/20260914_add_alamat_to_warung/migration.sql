-- AlterTable
ALTER TABLE "warungs" ADD COLUMN "alamat" TEXT;

-- Update kasir Antarsari
UPDATE "warungs" SET "alamat" = 'Jl. Pangeran Antasari No.20' WHERE "nama" ILIKE '%antarsari%';
