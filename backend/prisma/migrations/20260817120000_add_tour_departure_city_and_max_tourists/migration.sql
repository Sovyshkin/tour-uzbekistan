ALTER TABLE "Tour" ADD COLUMN "departureCity" TEXT;
ALTER TABLE "Tour" ADD COLUMN "maxTouristCount" INTEGER;

UPDATE "Tour"
SET "maxTouristCount" = COALESCE("maxGroupSize", "maxAdultCount" + "maxChildCount")
WHERE "maxTouristCount" IS NULL;

CREATE INDEX "Tour_departureCity_status_idx" ON "Tour"("departureCity", "status");
