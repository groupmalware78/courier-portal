import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());

const preAlertSchema = z.object({
  trackingNumber: z.preprocess(asString, z.string().trim().min(1, "Tracking number is required").max(100)),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1"),
  packageType: z.enum(PACKAGE_TYPE_VALUES),
  description: z.preprocess(asString, z.string().trim().min(1, "Package description is required").max(150)),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0"),
  cost: z.coerce.number().min(0, "Cost must be 0 or more").optional(),
  additionalDetails: optionalTrimmed(500),
  merchantName: optionalTrimmed(150),
});

const MAX_INVOICE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_INVOICE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user: portalUser } = await apiClient.portalUsers.get(session.user.id);
  if (!portalUser.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before submitting a pre-alert." },
      { status: 403 }
    );
  }

  try {
    await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const { customer } = await apiClient.customers.byEmail(session.user.email ?? "");
  if (!customer) {
    return NextResponse.json(
      { error: "We couldn't find your customer record. Please contact support." },
      { status: 404 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = preAlertSchema.safeParse({
    trackingNumber: formData.get("trackingNumber"),
    pieces: formData.get("pieces"),
    packageType: formData.get("packageType"),
    description: formData.get("description"),
    weightLbs: formData.get("weightLbs"),
    cost: formData.get("cost") || undefined,
    additionalDetails: formData.get("additionalDetails"),
    merchantName: formData.get("merchantName"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const file = formData.get("invoice");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "An invoice or receipt is required." }, { status: 400 });
  }
  if (!ALLOWED_INVOICE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported invoice file type. Use PDF, JPEG, or PNG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_INVOICE_SIZE_BYTES) {
    return NextResponse.json({ error: "Invoice file must be 10MB or smaller." }, { status: 400 });
  }

  const { trackingNumber, pieces, packageType, description, weightLbs, cost, additionalDetails, merchantName } =
    parsed.data;

  const invoiceBytes = new Uint8Array(await file.arrayBuffer());

  try {
    const { package: pkg } = await apiClient.packages.createPreAlert({
      trackingNumber,
      pieces: String(pieces),
      packageType,
      description,
      weightLbs: String(weightLbs),
      cost: cost !== undefined ? String(cost) : undefined,
      additionalDetails,
      merchantName,
      customerId: customer.id,
      changedByLabel: `${session.user.name} (Customer pre-alert)`,
      invoiceBytes,
      invoiceFileName: file.name,
    });
    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
