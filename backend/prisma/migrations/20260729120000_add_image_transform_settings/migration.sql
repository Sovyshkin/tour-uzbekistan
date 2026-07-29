ALTER TABLE "Country" ADD COLUMN "heroImageSettings" JSONB;

ALTER TABLE "Tour" ADD COLUMN "mainImageSettings" JSONB;
ALTER TABLE "Tour" ADD COLUMN "routeMapImageSettings" JSONB;

ALTER TABLE "Service" ADD COLUMN "previewImageSettings" JSONB;

ALTER TABLE "HomeBanner" ADD COLUMN "imageSettings" JSONB;

ALTER TABLE "News" ADD COLUMN "previewImageSettings" JSONB;

ALTER TABLE "WhyCategory" ADD COLUMN "heroImageSettings" JSONB;

ALTER TABLE "WhyFact" ADD COLUMN "imageSettings" JSONB;
