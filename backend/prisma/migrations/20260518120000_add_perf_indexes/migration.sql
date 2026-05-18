-- Performance indexes — non-destructive, additive only.
-- Targets the four hottest scans uncovered by the Neon CU audit:
--   1. /api/stats/summary  — low-stock count + paid-orders revenue/count
--   2. /api/customer/orders + customer.routes  — lookup by customerEmail
--   3. Public order lookup by email
--   4. Order list filtered by paymentStatus (admin orders + stats)

-- Inventory low-stock count: WHERE quantity <= 5
CREATE INDEX IF NOT EXISTS "Inventory_quantity_idx"
  ON "Inventory"("quantity");

-- Stats /summary + /sales: WHERE paymentStatus = 'PAID' AND createdAt >= ...
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_createdAt_idx"
  ON "Order"("paymentStatus", "createdAt" DESC);

-- Customer order history + public lookup by email
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx"
  ON "Order"("customerEmail");
