CREATE TABLE "Page" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageTranslation" (
  "id" UUID NOT NULL,
  "pageId" UUID NOT NULL,
  "locale" "Locale" NOT NULL,
  "title" TEXT NOT NULL,
  "menuLabel" TEXT,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "content" JSONB,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  CONSTRAINT "PageTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSetting" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'general',
  "value" JSONB,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSettingTranslation" (
  "id" UUID NOT NULL,
  "siteSettingId" UUID NOT NULL,
  "locale" "Locale" NOT NULL,
  "label" TEXT NOT NULL,
  "textValue" TEXT,
  "description" TEXT,
  CONSTRAINT "SiteSettingTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL,
  "fileName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "altText" TEXT,
  "group" TEXT DEFAULT 'general',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE UNIQUE INDEX "Page_path_key" ON "Page"("path");
CREATE INDEX "Page_status_sortOrder_idx" ON "Page"("status", "sortOrder");
CREATE INDEX "PageTranslation_locale_idx" ON "PageTranslation"("locale");
CREATE UNIQUE INDEX "PageTranslation_pageId_locale_key" ON "PageTranslation"("pageId", "locale");
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");
CREATE INDEX "SiteSetting_group_isPublic_idx" ON "SiteSetting"("group", "isPublic");
CREATE INDEX "SiteSettingTranslation_locale_idx" ON "SiteSettingTranslation"("locale");
CREATE UNIQUE INDEX "SiteSettingTranslation_siteSettingId_locale_key" ON "SiteSettingTranslation"("siteSettingId", "locale");
CREATE INDEX "MediaAsset_group_idx" ON "MediaAsset"("group");

ALTER TABLE "PageTranslation" ADD CONSTRAINT "PageTranslation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteSettingTranslation" ADD CONSTRAINT "SiteSettingTranslation_siteSettingId_fkey" FOREIGN KEY ("siteSettingId") REFERENCES "SiteSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
