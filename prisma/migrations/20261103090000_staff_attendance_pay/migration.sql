-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'HALF_DAY', 'ABSENT', 'PAID_LEAVE');

-- CreateEnum
CREATE TYPE "StaffPaymentKind" AS ENUM ('ADVANCE', 'SALARY', 'BONUS', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "MoneyMode" AS ENUM ('CASH', 'UPI', 'BANK');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HELPER';

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "joinedOn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "leftOn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salary" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salaryType" "SalaryType" NOT NULL DEFAULT 'MONTHLY';

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "markedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPayment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "kind" "StaffPaymentKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "mode" "MoneyMode",
    "note" TEXT NOT NULL DEFAULT '',
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_staffId_day_key" ON "Attendance"("staffId", "day");

-- CreateIndex
CREATE INDEX "StaffPayment_staffId_month_idx" ON "StaffPayment"("staffId", "month");

-- CreateIndex
CREATE INDEX "StaffPayment_createdAt_idx" ON "StaffPayment"("createdAt");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

