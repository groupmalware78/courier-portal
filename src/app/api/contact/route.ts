import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import { getPortalSettings } from "@/lib/settings";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

const contactSchema = z.object({
  name: z.preprocess(asString, z.string().trim().min(1, "Name is required").max(150)),
  email: z.preprocess(asString, z.string().trim().min(1, "Email is required").email("Enter a valid email address")),
  subject: z.preprocess(asString, z.string().trim().max(150).optional()),
  message: z.preprocess(asString, z.string().trim().min(1, "Message is required").max(2000)),
});

export async function POST(request: NextRequest) {
  try {
    await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = parsed.data;
  const settings = await getPortalSettings();
  const to = settings.contactEmail;

  if (!to) {
    return NextResponse.json(
      { error: "This company hasn't set up a contact email yet. Please try again later." },
      { status: 503 }
    );
  }

  const result = await apiClient.tenant.sendEmail({
    to,
    replyTo: email,
    subject: `[Contact form] ${subject || "New message"} — from ${name}`,
    html: `
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${message}</p>
    `,
  });

  return NextResponse.json(result);
}
