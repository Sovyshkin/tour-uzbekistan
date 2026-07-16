-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBannerTranslation" (
    "id" UUID NOT NULL,
    "homeBannerId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "buttonLabel" TEXT,
    "altText" TEXT,

    CONSTRAINT "HomeBannerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeBanner_slug_key" ON "HomeBanner"("slug");

-- CreateIndex
CREATE INDEX "HomeBanner_isActive_sortOrder_idx" ON "HomeBanner"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeBannerTranslation_locale_idx" ON "HomeBannerTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "HomeBannerTranslation_homeBannerId_locale_key" ON "HomeBannerTranslation"("homeBannerId", "locale");

-- AddForeignKey
ALTER TABLE "HomeBannerTranslation" ADD CONSTRAINT "HomeBannerTranslation_homeBannerId_fkey" FOREIGN KEY ("homeBannerId") REFERENCES "HomeBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
