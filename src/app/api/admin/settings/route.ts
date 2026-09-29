import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";
import { PHONE_FORMAT_REGEX } from "@/lib/phoneFormat";

const hexColor = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, message);

const settingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(150),
  logoEmoji: z.string().trim().min(1, "Pick an emoji for the logo").max(8),
  primaryColor: hexColor("Enter a hex color like #0f172a"),
  gradientFrom: hexColor("Enter a hex color like #1e1b4b"),
  gradientVia: hexColor("Enter a hex color like #581c87"),
  gradientTo: hexColor("Enter a hex color like #831843"),
  welcomeMessage: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
      message: "Enter a phone number in the format +1 (000) 000-0000",
    }),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { companyName, logoEmoji, primaryColor, gradientFrom, gradientVia, gradientTo, welcomeMessage, contactEmail, contactPhone } =
    parsed.data;

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const { settings } = await apiClient.portalSettings.update(companyId, {
    companyName,
    logoEmoji,
    primaryColor,
    gradientFrom,
    gradientVia,
    gradientTo,
    welcomeMessage: welcomeMessage || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
  });

  return NextResponse.json({ settings });
}
