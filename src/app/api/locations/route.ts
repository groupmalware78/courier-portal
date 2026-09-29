import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyIdOrNull } from "@/lib/tenant";

// Public — used by the signup form's "Preferred store location" dropdown.
export async function GET() {
  const companyId = await getTenantCompanyIdOrNull();
  if (!companyId) return NextResponse.json({ locations: [] });

  const { locations } = await apiClient.locations.list({ activeOnly: true });

  return NextResponse.json({
    locations: locations.map((l) => ({ id: l.id, name: l.name, address: l.address })),
  });
}
