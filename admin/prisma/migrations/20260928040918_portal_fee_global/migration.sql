-- AlterTable
ALTER TABLE "companies" DROP COLUMN "portalFeeMonthly";

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "portalFeeMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0;

