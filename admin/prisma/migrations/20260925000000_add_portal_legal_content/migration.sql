-- Tenant-editable Terms and Conditions / Privacy Policy body text — see
-- the comment on PortalSettings.termsContent in schema.prisma. Purely
-- additive nullable columns, no data migration needed.
ALTER TABLE "portal_settings"
  ADD COLUMN "termsContent" TEXT,
  ADD COLUMN "privacyContent" TEXT;
