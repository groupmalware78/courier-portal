import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

// One invoice slot per shipment — uploading again replaces the old file.
// Customer-only: verified against the Customer row matched by the signed-in
// user's own email, same lookup /my-shipments itself uses.
async function findOwnedPackageId(id: string, companyId: string, customerEmail: string): Promise<string | null> {
  const { customer } = await apiClient.customers.byEmail(customerEmail);
  if (!customer) return null;
  try {
    const { package: pkg } = await apiClient.packages.get(id);
    if (pkg.companyId !== companyId || pkg.customerId !== customer.id) return null;
    return pkg.id;
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

// Serves the customer's own uploaded receipt bytes — was a direct static
// file link before (/uploads/invoices/...); now proxied through admin
// since customer-portal has no filesystem/DB slot of its own to own it in.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const packageId = await findOwnedPackageId(id, companyId, session.user.email ?? "");
  if (!packageId) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  try {
    const { bytes, contentType, fileName } = await apiClient.files.getPackageReceipt(packageId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName ?? "receipt"}"`,
      },
    });
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "No receipt uploaded for this shipment." }, { status: 404 });
    }
    throw err;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const packageId = await findOwnedPackageId(id, companyId, session.user.email ?? "");
  if (!packageId) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, JPEG, or PNG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be 10MB or smaller." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const { fileName } = await apiClient.files.uploadPackageReceipt(packageId, bytes, file.name);
    return NextResponse.json({
      invoiceFileName: fileName,
      invoiceUploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const packageId = await findOwnedPackageId(id, companyId, session.user.email ?? "");
  if (!packageId) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  await apiClient.files.deletePackageReceipt(packageId);
  return NextResponse.json({ success: true });
}
