-- AlterTable: extend per-order email-send tracking to the three remaining
-- transactional emails. Same shape as confirmationEmailSentAt / *LastError
-- so the retry sweep, idempotency gates, and admin "resend" buttons can
-- treat every email type the same way:
--
--   shipmentEmail*     → invoice-style "your order has shipped" with tracking
--                        (sent when an AWB is generated, courier or manual).
--   deliveryEmail*     → "delivered" confirmation, sent on shipping webhook,
--                        the Delhivery poller, or the pickup PICKED_UP step.
--   pickupReadyEmail*  → "ready to collect" mail for store-pickup orders.
--
-- LastError stores the verbatim Resend error so admins can see *why* a send
-- failed without digging through container logs.
ALTER TABLE "Order"
  ADD COLUMN "shipmentEmailSentAt"        TIMESTAMP(3),
  ADD COLUMN "shipmentEmailLastError"     TEXT,
  ADD COLUMN "deliveryEmailSentAt"        TIMESTAMP(3),
  ADD COLUMN "deliveryEmailLastError"     TEXT,
  ADD COLUMN "pickupReadyEmailSentAt"     TIMESTAMP(3),
  ADD COLUMN "pickupReadyEmailLastError"  TEXT;

-- Indexes used by the retry sweep to cheaply find candidates whose email
-- never went out (WHERE <col> IS NULL AND <gating ts> > NOW() - INTERVAL '24 hours').
CREATE INDEX "Order_shipmentEmailSentAt_idx"    ON "Order"("shipmentEmailSentAt");
CREATE INDEX "Order_deliveryEmailSentAt_idx"    ON "Order"("deliveryEmailSentAt");
CREATE INDEX "Order_pickupReadyEmailSentAt_idx" ON "Order"("pickupReadyEmailSentAt");
