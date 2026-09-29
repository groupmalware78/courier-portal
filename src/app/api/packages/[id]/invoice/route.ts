import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewPackages } from "@/lib/rbac";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  const { id } = await params;

  let pkg;
  try {
    ({ package: pkg } = await apiClient.packages.get(id));
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
    }
    throw err;
  }

  // Staff (admin/CSR/driver) can view any of this tenant's invoices;
  // customers can only view their own — matched the same way
  // /my-shipments/[id] matches ownership (by the signed-in email).
  const allowed =
    session.user.role === "CUSTOMER"
      ? pkg.customer?.email === session.user.email
      : canViewPackages(session.user.role);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { bytes, contentType, fileName } = await apiClient.packages.downloadGeneratedInvoice(id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName ?? "invoice.pdf"}"`,
      },
    });
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "No invoice has been generated for this package." }, { status: 404 });
    }
    throw err;
  }
}
