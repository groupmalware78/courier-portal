-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'PORTAL_INVOICE';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "hostingCostMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "portalFeeMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "manifests" ADD COLUMN     "invoicePaidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "portal_invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "portalFeeAmount" DOUBLE PRECISION NOT NULL,
    "hostingCostAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "invoicePdf" BYTEA,
    "invoiceFileName" TEXT,
    "invoiceGeneratedAt" TIMESTAMP(3),
    "invoiceDueDate" TIMESTAMP(3),
    "invoicePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_invoices_companyId_period_key" ON "portal_invoices"("companyId", "period");

-- AddForeignKey
ALTER TABLE "portal_invoices" ADD CONSTRAINT "portal_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

