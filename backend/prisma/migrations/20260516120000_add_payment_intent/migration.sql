-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "rzpOrderId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'DELIVERY',
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPincode" TEXT,
    "notes" TEXT,
    "couponCode" TEXT,
    "items" JSONB NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_rzpOrderId_key" ON "PaymentIntent"("rzpOrderId");

-- CreateIndex
CREATE INDEX "PaymentIntent_consumedAt_idx" ON "PaymentIntent"("consumedAt");
