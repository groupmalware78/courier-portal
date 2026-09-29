import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyIdOrNull } from "@/lib/tenant";

// Public — shown on the homepage rates section and used by the calculator.
export async function GET() {
  const companyId = await getTenantCompanyIdOrNull();
  if (!companyId) return NextResponse.json({ rates: [] });

  const { rates } = await apiClient.shippingRates.list();

  return NextResponse.json({ rates });
}
