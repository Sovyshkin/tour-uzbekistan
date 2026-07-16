ALTER TABLE "Country"
ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Country"
SET "status" = 'PUBLISHED'
WHERE "slug" IN ('uzbekistan', 'kazakhstan');

DROP INDEX IF EXISTS "Country_isFeatured_sortOrder_idx";

CREATE INDEX "Country_status_isFeatured_sortOrder_idx"
ON "Country"("status", "isFeatured", "sortOrder");
