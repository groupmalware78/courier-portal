import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const trackingNumber = request.nextUrl.searchParams.get("trackingNumber")?.trim();
  if (!trackingNumber) {
    return NextResponse.json({ error: "Enter a tracking number." }, { status: 400 });
  }

  try {
    await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  // Exact match only — no partial/fuzzy search on a public endpoint, to
  // avoid letting someone enumerate other customers' shipments. Scoped to
  // this deployment's company via the SDK's api key — the shared database
  // holds every tenant's packages, so an unscoped lookup would leak
  // another freight forwarder's shipment status through this tenant's
  // public tracking page.
  const { packages } = await apiClient.packages.list({ trackingNumber, pageSize: 1 });
  const pkg = packages[0];

  if (!pkg) {
    return NextResponse.json({ error: "No shipment found for that tracking number." }, { status: 404 });
  }

  return NextResponse.json({
    package: {
      trackingNumber: pkg.trackingNumber,
      status: pkg.status,
      weightLbs: pkg.weightLbs,
      description: pkg.description,
      receivedAt: pkg.receivedAt,
      company: pkg.company ? { name: pkg.company.name } : null,
    },
  });
}
