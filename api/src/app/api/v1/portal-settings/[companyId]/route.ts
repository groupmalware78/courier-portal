import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, internalAuthErrorResponse } from "@/lib/internalAuth";

// Public-ish in effect: customer-portal's getPortalSettings() calls this
// (via the SDK) from unauthenticated pages too (homepage, login, signup)
// to render branding — auth here is still the x-api-key, just not gated
// behind a portal user session on the caller's side.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Explicit omit — resendApiKeyEncrypted/smtpPasswordEncrypted must never
  // reach a caller through this broad, effectively-public-to-any-tenant
  // route. The dedicated ./email-provider sub-route is the only place
  // that touches those columns (and even it only ever returns whether a
  // secret is set, never the value).
  const settings = await prisma.portalSettings.findUnique({
    where: { id: companyId },
    omit: { resendApiKeyEncrypted: true, smtpPasswordEncrypted: true },
  });
  return NextResponse.json({ settings });
}

// One broad partial-update endpoint standing in for customer-portal's 4
// separate admin/{settings,banking,warehouse,manifest-schedule} routes —
// each of those still does its own RBAC/validation before calling this
// with just the fields it owns. File-upload fields (logoUrl, faviconUrl,
// heroImageUrl) are set via internal/files instead, not here.
const settingsPatchSchema = z.object({
  companyName: z.string().trim().min(1).max(150).optional(),
  logoEmoji: z.string().trim().max(10).optional(),
  primaryColor: z.string().trim().max(20).optional(),
  gradientFrom: z.string().trim().max(20).optional(),
  gradientVia: z.string().trim().max(20).optional(),
  gradientTo: z.string().trim().max(20).optional(),
  welcomeMessage: z.string().trim().max(1000).optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  termsContent: z.string().trim().max(20000).optional().nullable(),
  privacyContent: z.string().trim().max(20000).optional().nullable(),

  manifestAutoGenerate: z.boolean().optional(),
  manifestTime: z.string().trim().max(5).optional().nullable(),
  manifestDays: z.array(z.string()).optional(),

  warehouseName: z.string().trim().max(150).optional().nullable(),
  warehouseAddressLine1: z.string().trim().max(150).optional().nullable(),
  warehouseAddressLine2: z.string().trim().max(150).optional().nullable(),
  warehouseCity: z.string().trim().max(100).optional().nullable(),
  warehouseState: z.string().trim().max(100).optional().nullable(),
  warehouseZip: z.string().trim().max(20).optional().nullable(),
  warehouseCountry: z.string().trim().max(100).optional().nullable(),
  warehousePhone: z.string().trim().max(30).optional().nullable(),

  bankName: z.string().trim().max(150).optional().nullable(),
  bankAccountName: z.string().trim().max(150).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  bankRoutingNumber: z.string().trim().max(50).optional().nullable(),
  bankBranch: z.string().trim().max(150).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  let companyId: string;
  try {
    ({ companyId } = await requireInternalAuth(request));
  } catch (err) {
    return internalAuthErrorResponse(err);
  }

  const { companyId: requestedId } = await params;
  if (requestedId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const settings = await prisma.portalSettings.upsert({
    where: { id: companyId },
    create: { id: companyId, companyName: company.name, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ settings });
}
