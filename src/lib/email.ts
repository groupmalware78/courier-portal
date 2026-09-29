import { apiClient } from "./apiClient";

interface WarehouseAddress {
  warehouseName: string | null;
  warehouseAddressLine1: string | null;
  warehouseAddressLine2: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
}

interface VerificationEmailInput {
  to: string;
  name: string;
  companyName: string;
  verificationUrl: string;
  customerCode?: string | null;
  warehouse?: WarehouseAddress | null;
}

function renderShippingAddressHtml(customerCode: string | null | undefined, warehouse: WarehouseAddress | null | undefined) {
  const hasAddress = !!(warehouse?.warehouseName || warehouse?.warehouseAddressLine1);
  if (!hasAddress && !customerCode) return "";

  const lines: string[] = [];
  if (warehouse?.warehouseName) lines.push(`<strong>${warehouse.warehouseName}</strong>`);
  if (warehouse?.warehouseAddressLine1) lines.push(warehouse.warehouseAddressLine1);
  if (warehouse?.warehouseAddressLine2) lines.push(warehouse.warehouseAddressLine2);
  const cityLine = [warehouse?.warehouseCity, warehouse?.warehouseState, warehouse?.warehouseZip]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (warehouse?.warehouseCountry) lines.push(warehouse.warehouseCountry);

  return `
    <div style="margin-top: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
      ${customerCode ? `<p style="margin: 0 0 8px;">Your customer ID: <strong>${customerCode}</strong></p>` : ""}
      ${
        hasAddress
          ? `
        <p style="margin: 0 0 4px; font-weight: 600;">Your shipping address</p>
        <p style="margin: 0 0 4px; color: #475569;">Use this when shopping online — packages are received here.</p>
        <p style="margin: 8px 0 0; line-height: 1.5;">${lines.join("<br />")}</p>
        ${warehouse?.warehousePhone ? `<p style="margin: 8px 0 0; color: #64748b;">${warehouse.warehousePhone}</p>` : ""}
        ${
          customerCode
            ? `<p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">Include your customer ID (${customerCode}) on address line 2 so it can be matched to your account.</p>`
            : ""
        }
      `
          : ""
      }
    </div>
  `;
}

// Composes the subject/HTML here, delegates actual delivery to api/'s
// POST /v1/tenant/email/send, which sends through this tenant's own
// configured provider (Resend/SMTP) or the platform default — see
// api/src/lib/tenantEmailSender.ts. customer-portal never holds a
// Resend/SMTP client itself.
export async function sendVerificationEmail(
  input: VerificationEmailInput
): Promise<{ sent: boolean }> {
  const addressHtml = renderShippingAddressHtml(input.customerCode, input.warehouse);

  return apiClient.tenant.sendEmail({
    to: input.to,
    subject: `Verify your email for ${input.companyName}`,
    html: `
      <p>Hi ${input.name},</p>
      <p>Confirm your email address to finish setting up your ${input.companyName} account:</p>
      <p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      ${addressHtml}
    `,
  });
}

interface PasswordResetEmailInput {
  to: string;
  name: string;
  companyName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput
): Promise<{ sent: boolean }> {
  return apiClient.tenant.sendEmail({
    to: input.to,
    subject: `Reset your password for ${input.companyName}`,
    html: `
      <p>Hi ${input.name},</p>
      <p>We received a request to reset your ${input.companyName} account password. Click the link below to choose a new one:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
