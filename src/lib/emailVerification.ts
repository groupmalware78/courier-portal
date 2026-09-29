import { apiClient } from "./apiClient";
import { sendVerificationEmail } from "./email";
import { getPortalSettings } from "./settings";

// Sends the verification email for a token already issued by admin (either
// at signup, which issues its own token as part of that transaction, or via
// a fresh issueEmailVerification() call for "resend" requests) — admin owns
// the token/DB side, customer-portal owns the Resend template/branding and
// the public verify-email link.
async function sendVerificationEmailForToken(
  user: { name: string; email: string },
  token: string,
  options?: { customerCode?: string | null }
): Promise<{ sent: boolean }> {
  const settings = await getPortalSettings();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  return sendVerificationEmail({
    to: user.email,
    name: user.name,
    companyName: settings.companyName,
    verificationUrl,
    customerCode: options?.customerCode,
    warehouse: {
      warehouseName: settings.warehouseName,
      warehouseAddressLine1: settings.warehouseAddressLine1,
      warehouseAddressLine2: settings.warehouseAddressLine2,
      warehouseCity: settings.warehouseCity,
      warehouseState: settings.warehouseState,
      warehouseZip: settings.warehouseZip,
      warehouseCountry: settings.warehouseCountry,
      warehousePhone: settings.warehousePhone,
    },
  });
}

// Used right after signup, where admin's signup transaction already issued
// the token — avoids a second, wasted token issuance/round trip.
export async function sendSignupVerificationEmail(
  user: { name: string; email: string },
  token: string,
  options?: { customerCode?: string | null }
): Promise<{ sent: boolean }> {
  return sendVerificationEmailForToken(user, token, options);
}

// Used for "resend verification" — asks admin to issue a fresh token, then
// sends it.
export async function issueVerificationEmail(
  user: { id: string; name: string; email: string },
  options?: { customerCode?: string | null }
): Promise<{ sent: boolean }> {
  const { token } = await apiClient.portalUsers.issueEmailVerification(user.id);
  return sendVerificationEmailForToken(user, token, options);
}
