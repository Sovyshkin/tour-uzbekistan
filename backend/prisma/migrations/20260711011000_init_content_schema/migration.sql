-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ru', 'en', 'uz');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'PARTNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('AGENCY', 'OPERATOR', 'TRANSPORT', 'HOTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TourType" AS ENUM ('ONE_DAY', 'SHORT', 'MULTI_DAY', 'GROUP', 'PRIVATE', 'MICE');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('WINTER', 'SPRING', 'SUMMER', 'AUTUMN', 'ALL_YEAR');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('GENERAL', 'TOUR', 'SERVICE', 'NEWS', 'COUNTRY', 'PARTNER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'QUALIFIED', 'WON', 'LOST', 'SPAM');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('B2C', 'B2B');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "preferredLocale" "Locale" NOT NULL DEFAULT 'ru',
    "partnerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTranslation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "notes" TEXT,

    CONSTRAINT "UserTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "city" TEXT,
    "tin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredLocale" "Locale" NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTranslation" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contactTitle" TEXT,
    "submitLabel" TEXT,

    CONSTRAINT "PartnerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "isoCode" TEXT,
    "heroImage" TEXT,
    "flagImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "preferredLocale" "Locale" NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryTranslation" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "welcomeTitle" TEXT,
    "intro" TEXT,
    "sidebarTitle" TEXT,
    "cities" JSONB,
    "toc" JSONB,
    "sections" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "CountryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TourType" NOT NULL,
    "season" "Season" NOT NULL DEFAULT 'ALL_YEAR',
    "heroImage" TEXT,
    "mainImage" TEXT,
    "routeMapImage" TEXT,
    "durationDays" INTEGER NOT NULL,
    "durationNights" INTEGER NOT NULL,
    "minGroupSize" INTEGER,
    "maxGroupSize" INTEGER,
    "comfortLevel" INTEGER,
    "priceFrom" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "showPriceToB2C" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourTranslation" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "route" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hotelsInfo" TEXT,
    "transportInfo" TEXT,
    "countriesInfo" TEXT,
    "included" JSONB,
    "excluded" JSONB,
    "localizedSlug" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "TourTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDay" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "overnightAt" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDayTranslation" (
    "id" UUID NOT NULL,
    "tourDayId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "description" TEXT NOT NULL,
    "inclusions" JSONB,

    CONSTRAINT "TourDayTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourImage" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourImageTranslation" (
    "id" UUID NOT NULL,
    "tourImageId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "TourImageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "heroImage" TEXT,
    "previewImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "leadFormEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTranslation" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "shortDescription" TEXT,
    "content" JSONB,
    "localizedSlug" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "ServiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "heroImage" TEXT,
    "previewImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "syncToB2B" BOOLEAN NOT NULL DEFAULT true,
    "syncToB2C" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsTranslation" (
    "id" UUID NOT NULL,
    "newsId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB,
    "localizedSlug" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "NewsTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "heroImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyCategoryTranslation" (
    "id" UUID NOT NULL,
    "whyCategoryId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "WhyCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyFact" (
    "id" UUID NOT NULL,
    "whyCategoryId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhyFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyFactTranslation" (
    "id" UUID NOT NULL,
    "whyFactId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "WhyFactTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "audience" "AudienceType" NOT NULL DEFAULT 'B2C',
    "locale" "Locale" NOT NULL DEFAULT 'ru',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "sourcePagePath" TEXT,
    "sourcePageTitle" TEXT,
    "countryId" UUID,
    "tourId" UUID,
    "serviceId" UUID,
    "newsId" UUID,
    "partnerId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTranslation" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "formTitle" TEXT,
    "submitLabel" TEXT,

    CONSTRAINT "LeadTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "audience" "AudienceType" NOT NULL DEFAULT 'B2B',
    "locale" "Locale" NOT NULL DEFAULT 'ru',
    "tourId" UUID,
    "partnerId" UUID,
    "countryId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "nationality" TEXT,
    "documentType" TEXT,
    "documentSeries" TEXT,
    "documentNumber" TEXT,
    "documentIssuedAt" TIMESTAMP(3),
    "documentValidUntil" TIMESTAMP(3),
    "travelDate" TIMESTAMP(3),
    "groupSize" INTEGER,
    "hotelName" TEXT,
    "totalPrice" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "sourcePagePath" TEXT,
    "includedServicesSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTranslation" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "packageTitle" TEXT,
    "packageSummary" TEXT,
    "specialRequests" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "BookingTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_partnerId_idx" ON "User"("partnerId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "UserTranslation_locale_idx" ON "UserTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "UserTranslation_userId_locale_key" ON "UserTranslation"("userId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_tin_key" ON "Partner"("tin");

-- CreateIndex
CREATE INDEX "Partner_type_isActive_idx" ON "Partner"("type", "isActive");

-- CreateIndex
CREATE INDEX "PartnerTranslation_locale_idx" ON "PartnerTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerTranslation_partnerId_locale_key" ON "PartnerTranslation"("partnerId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE INDEX "Country_isFeatured_sortOrder_idx" ON "Country"("isFeatured", "sortOrder");

-- CreateIndex
CREATE INDEX "CountryTranslation_locale_idx" ON "CountryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CountryTranslation_countryId_locale_key" ON "CountryTranslation"("countryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE INDEX "Tour_countryId_idx" ON "Tour"("countryId");

-- CreateIndex
CREATE INDEX "Tour_status_isFeatured_idx" ON "Tour"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "Tour_type_season_idx" ON "Tour"("type", "season");

-- CreateIndex
CREATE INDEX "TourTranslation_locale_idx" ON "TourTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "TourTranslation_tourId_locale_key" ON "TourTranslation"("tourId", "locale");

-- CreateIndex
CREATE INDEX "TourDay_tourId_idx" ON "TourDay"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "TourDay_tourId_dayNumber_key" ON "TourDay"("tourId", "dayNumber");

-- CreateIndex
CREATE INDEX "TourDayTranslation_locale_idx" ON "TourDayTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "TourDayTranslation_tourDayId_locale_key" ON "TourDayTranslation"("tourDayId", "locale");

-- CreateIndex
CREATE INDEX "TourImage_tourId_sortOrder_idx" ON "TourImage"("tourId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourImageTranslation_locale_idx" ON "TourImageTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "TourImageTranslation_tourImageId_locale_key" ON "TourImageTranslation"("tourImageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_status_isFeatured_sortOrder_idx" ON "Service"("status", "isFeatured", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceTranslation_locale_idx" ON "ServiceTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTranslation_serviceId_locale_key" ON "ServiceTranslation"("serviceId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsTranslation_locale_idx" ON "NewsTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "NewsTranslation_newsId_locale_key" ON "NewsTranslation"("newsId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "WhyCategory_slug_key" ON "WhyCategory"("slug");

-- CreateIndex
CREATE INDEX "WhyCategory_status_sortOrder_idx" ON "WhyCategory"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "WhyCategoryTranslation_locale_idx" ON "WhyCategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "WhyCategoryTranslation_whyCategoryId_locale_key" ON "WhyCategoryTranslation"("whyCategoryId", "locale");

-- CreateIndex
CREATE INDEX "WhyFact_whyCategoryId_sortOrder_idx" ON "WhyFact"("whyCategoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "WhyFact_status_idx" ON "WhyFact"("status");

-- CreateIndex
CREATE INDEX "WhyFactTranslation_locale_idx" ON "WhyFactTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "WhyFactTranslation_whyFactId_locale_key" ON "WhyFactTranslation"("whyFactId", "locale");

-- CreateIndex
CREATE INDEX "Lead_status_type_audience_idx" ON "Lead"("status", "type", "audience");

-- CreateIndex
CREATE INDEX "Lead_countryId_idx" ON "Lead"("countryId");

-- CreateIndex
CREATE INDEX "Lead_tourId_idx" ON "Lead"("tourId");

-- CreateIndex
CREATE INDEX "Lead_serviceId_idx" ON "Lead"("serviceId");

-- CreateIndex
CREATE INDEX "Lead_newsId_idx" ON "Lead"("newsId");

-- CreateIndex
CREATE INDEX "Lead_partnerId_idx" ON "Lead"("partnerId");

-- CreateIndex
CREATE INDEX "LeadTranslation_locale_idx" ON "LeadTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "LeadTranslation_leadId_locale_key" ON "LeadTranslation"("leadId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_status_audience_idx" ON "Booking"("status", "audience");

-- CreateIndex
CREATE INDEX "Booking_tourId_idx" ON "Booking"("tourId");

-- CreateIndex
CREATE INDEX "Booking_partnerId_idx" ON "Booking"("partnerId");

-- CreateIndex
CREATE INDEX "Booking_countryId_idx" ON "Booking"("countryId");

-- CreateIndex
CREATE INDEX "BookingTranslation_locale_idx" ON "BookingTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "BookingTranslation_bookingId_locale_key" ON "BookingTranslation"("bookingId", "locale");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTranslation" ADD CONSTRAINT "UserTranslation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTranslation" ADD CONSTRAINT "PartnerTranslation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryTranslation" ADD CONSTRAINT "CountryTranslation_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTranslation" ADD CONSTRAINT "TourTranslation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourDay" ADD CONSTRAINT "TourDay_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourDayTranslation" ADD CONSTRAINT "TourDayTranslation_tourDayId_fkey" FOREIGN KEY ("tourDayId") REFERENCES "TourDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourImage" ADD CONSTRAINT "TourImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourImageTranslation" ADD CONSTRAINT "TourImageTranslation_tourImageId_fkey" FOREIGN KEY ("tourImageId") REFERENCES "TourImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTranslation" ADD CONSTRAINT "ServiceTranslation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsTranslation" ADD CONSTRAINT "NewsTranslation_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhyCategoryTranslation" ADD CONSTRAINT "WhyCategoryTranslation_whyCategoryId_fkey" FOREIGN KEY ("whyCategoryId") REFERENCES "WhyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhyFact" ADD CONSTRAINT "WhyFact_whyCategoryId_fkey" FOREIGN KEY ("whyCategoryId") REFERENCES "WhyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhyFactTranslation" ADD CONSTRAINT "WhyFactTranslation_whyFactId_fkey" FOREIGN KEY ("whyFactId") REFERENCES "WhyFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTranslation" ADD CONSTRAINT "LeadTranslation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTranslation" ADD CONSTRAINT "BookingTranslation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
