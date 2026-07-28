ALTER TABLE "Tour"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Tour_status_isFeatured_sortOrder_idx"
  ON "Tour"("status", "isFeatured", "sortOrder");
