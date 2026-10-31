-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('CALL_WAITER', 'BILL', 'ORDER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'DONE', 'REJECTED');

-- CreateTable
CREATE TABLE "TableRequest" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableRequest_outletId_status_idx" ON "TableRequest"("outletId", "status");

-- CreateIndex
CREATE INDEX "TableRequest_tableId_createdAt_idx" ON "TableRequest"("tableId", "createdAt");

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRequest" ADD CONSTRAINT "TableRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
