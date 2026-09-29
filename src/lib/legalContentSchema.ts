import { z } from "zod";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());

// Generous ceiling for a full legal document pasted in as plain text —
// see the comment on PortalSettings.termsContent in schema.prisma.
export const legalContentSchema = z.object({
  termsContent: optionalTrimmed(20000),
  privacyContent: optionalTrimmed(20000),
});
