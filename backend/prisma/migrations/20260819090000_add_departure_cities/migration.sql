CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "DepartureCity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartureCity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepartureCity_name_key" ON "DepartureCity"("name");
CREATE INDEX "DepartureCity_isActive_sortOrder_idx" ON "DepartureCity"("isActive", "sortOrder");

INSERT INTO "DepartureCity" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), trim("departureCity"), true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tour"
WHERE "departureCity" IS NOT NULL AND trim("departureCity") <> ''
ON CONFLICT ("name") DO NOTHING;
