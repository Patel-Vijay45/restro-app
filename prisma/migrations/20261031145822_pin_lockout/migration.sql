-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "failedPins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
