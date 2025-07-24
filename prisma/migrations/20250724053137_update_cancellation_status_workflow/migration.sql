/*
  Warnings:

  - You are about to drop the column `physicallyReturned` on the `OrderCancellation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OrderCancellation_physicallyReturned_idx";

-- AlterTable
ALTER TABLE "OrderCancellation" DROP COLUMN "physicallyReturned",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'cancelled';

-- CreateIndex
CREATE INDEX "OrderCancellation_status_idx" ON "OrderCancellation"("status");
