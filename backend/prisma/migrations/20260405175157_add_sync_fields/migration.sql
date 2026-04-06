-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING', 'CONFLICT');

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "posItemCode" TEXT,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- CreateIndex
CREATE INDEX "Inventory_syncStatus_idx" ON "Inventory"("syncStatus");
