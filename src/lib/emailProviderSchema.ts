import { z } from "zod";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());

// resendApiKey/smtpPassword: blank means "keep the existing stored
// secret" — see api/'s email-provider PATCH route, which only overwrites
// the encrypted column when a non-empty value is sent.
export const emailProviderSchema = z.object({
  emailProvider: z.enum(["RESEND", "SMTP", "PLATFORM_DEFAULT"]),
  emailFromAddress: z.preprocess(asString, z.string().trim().email().optional().or(z.literal(""))),
  resendApiKey: optionalTrimmed(500),
  smtpHost: optionalTrimmed(255),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUsername: optionalTrimmed(255),
  smtpSecure: z.boolean().optional(),
  smtpPassword: optionalTrimmed(500),
});

export const emailProviderTestSchema = emailProviderSchema
  .omit({ emailProvider: true })
  .extend({
    emailProvider: z.enum(["RESEND", "SMTP"]),
    to: z.preprocess(asString, z.string().trim().email("Enter a valid email address")),
  });
