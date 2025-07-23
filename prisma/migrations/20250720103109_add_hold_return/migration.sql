-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationNotes" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "holdReturn" BOOLEAN;

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_customerId_orderDate_idx" ON "Order"("customerId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_customerId_status_idx" ON "Order"("customerId", "status");

-- CreateIndex
CREATE INDEX "Order_cancellationReason_idx" ON "Order"("cancellationReason");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");
