-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT', 'ATTENDANCE', 'SALARY', 'GENERAL');

-- AlterEnum
-- New roles for Reception (front-desk, replaces day-to-day MANAGER usage) and Accountant (finance-only).
-- The old MANAGER value is intentionally left in place (unused going forward) since Postgres
-- cannot drop an enum value in the same migration it was introduced without a full type rewrite.
ALTER TYPE "UserRole" ADD VALUE 'RECEPTION';
ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';

-- AlterTable: add new salary columns first, backfill from the old column, then drop it.
ALTER TABLE "Teacher" ADD COLUMN     "salaryType" "SalaryType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "salaryValue" DOUBLE PRECISION;

UPDATE "Teacher" SET "salaryValue" = "salary", "salaryType" = 'FIXED';

ALTER TABLE "Teacher" DROP COLUMN "salary";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ALTER COLUMN "role" SET DEFAULT 'RECEPTION';

-- DataMigration: existing MANAGER accounts become RECEPTION (same permissions, new name).
UPDATE "User" SET "role" = 'RECEPTION' WHERE "role" = 'MANAGER';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
