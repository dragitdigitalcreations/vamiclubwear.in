-- CreateTable
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReview_email_key" ON "CustomerReview"("email");

-- CreateIndex
CREATE INDEX "CustomerReview_isApproved_createdAt_idx" ON "CustomerReview"("isApproved", "createdAt");
