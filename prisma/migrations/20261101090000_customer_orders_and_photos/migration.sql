-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('STAFF', 'ONLINE');

-- DropForeignKey
ALTER TABLE "TableRequest" DROP CONSTRAINT "TableRequest_tableId_fkey";

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "photoId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "pickupTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "trackToken" TEXT;

-- AlterTable
ALTER TABLE "TableRequest" ADD COLUMN     "customerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "customerPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kotId" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "pickupTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "trackToken" TEXT,
ALTER COLUMN "tableId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_photoId_key" ON "MenuItem"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackToken_key" ON "Order"("trackToken");

-- CreateIndex
CREATE UNIQUE INDEX "TableRequest_kotId_key" ON "TableRequest"("kotId");

-- CreateIndex
CREATE INDEX "TableRequest_trackToken_idx" ON "TableRequest"("trackToken");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_kotId_fkey" FOREIGN KEY ("kotId") REFERENCES "Kot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

