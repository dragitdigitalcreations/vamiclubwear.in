-- AlterTable: editorial fields for the Style Journal redesign
ALTER TABLE "BlogPost" ADD COLUMN "category" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogPost" ADD COLUMN "relatedProductSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Swap the listing index to include the new featured-first ordering
DROP INDEX IF EXISTS "BlogPost_status_publishedAt_idx";
CREATE INDEX "BlogPost_status_featured_publishedAt_idx" ON "BlogPost"("status", "featured", "publishedAt");
