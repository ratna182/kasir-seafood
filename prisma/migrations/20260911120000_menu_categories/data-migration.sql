-- Data Migration: assign all existing menus to default "Lainnya" category
-- Run AFTER schema migration.sql has been applied

-- Step 1: Insert "Lainnya" category for each warung
INSERT INTO "menu_categories" ("id", "warung_id", "nama", "sort_order", "is_aktif", "created_at")
SELECT gen_random_uuid(), "id", 'Lainnya', 0, true, NOW()
FROM "warungs"
ON CONFLICT ("warung_id", "nama") DO NOTHING;

-- Step 2: Assign all menus without category to "Lainnya"
UPDATE "menus" SET "category_id" = (
  SELECT "id" FROM "menu_categories"
  WHERE "menu_categories"."warung_id" = "menus"."warung_id"
    AND "menu_categories"."nama" = 'Lainnya'
  LIMIT 1
) WHERE "category_id" IS NULL;

-- Step 3: Make category_id NOT NULL after all data is assigned
ALTER TABLE "menus" ALTER COLUMN "category_id" SET NOT NULL;
