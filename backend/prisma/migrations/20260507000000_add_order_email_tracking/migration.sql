-- AlterTable: track transactional-email sends per order so we can detect
-- silent Resend failures, surface a "resend confirmation" button to admins,
-- and let a background sweep retry orders whose initial send didn't make it.
ALTER TABLE "Order"
  ADD COLUMN "confirmationEmailSentAt"    TIMESTAMP(3),
  ADD COLUMN "storeEmailSentAt"           TIMESTAMP(3),
  ADD COLUMN "confirmationEmailLastError" TEXT;

-- Index on confirmationEmailSentAt so the retry sweep can cheaply find recent
-- orders whose customer email never went out (WHERE confirmationEmailSentAt IS NULL
-- AND createdAt > NOW() - INTERVAL '24 hours').
CREATE INDEX "Order_confirmationEmailSentAt_idx" ON "Order"("confirmationEmailSentAt");
