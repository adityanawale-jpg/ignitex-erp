-- Catches up columns that existed on the local dev DB (used to write and test
-- the fgImport/finBom/min-max-planning Prisma migration) but were missing on
-- Dev — discovered via a schema-drift check before this session's deploy.
ALTER TABLE "fg_item_variant" ADD COLUMN IF NOT EXISTS "catalogue_reference" VARCHAR(200);
ALTER TABLE "fin_item_variant" ADD COLUMN IF NOT EXISTS "catalogue_reference" VARCHAR(200);
ALTER TABLE "min_max_planning_master" ADD COLUMN IF NOT EXISTS "item_name" VARCHAR(500);
