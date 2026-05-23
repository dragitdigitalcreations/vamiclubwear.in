-- POS sale reversal: link a RESTOCK row back to the ADJUSTMENT row it reverses.
-- Lets the admin "POS Returns" page list restorable scans and block double restoration.

ALTER TABLE "InventoryHistory"
  ADD COLUMN "reversalOfId" TEXT;

ALTER TABLE "InventoryHistory"
  ADD CONSTRAINT "InventoryHistory_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "InventoryHistory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "InventoryHistory_reversalOfId_idx"
  ON "InventoryHistory"("reversalOfId");
