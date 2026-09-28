-- DropForeignKey
ALTER TABLE "api_key_rotation_events" DROP CONSTRAINT "api_key_rotation_events_companyId_fkey";

-- DropIndex
DROP INDEX "companies_apiKeyPreviousHash_key";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "apiKeyPreviousExpiresAt",
DROP COLUMN "apiKeyPreviousHash",
DROP COLUMN "apiKeyRotationDays",
DROP COLUMN "apiKeyWebhookSecret",
DROP COLUMN "apiKeyWebhookUrl";

-- DropTable
DROP TABLE "api_key_rotation_events";

-- DropEnum
DROP TYPE "ApiKeyRotationTrigger";

