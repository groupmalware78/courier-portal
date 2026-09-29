import { NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { apiClient } from "@/lib/apiClient";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

export async function GET() {
  let companyId: string;
  try {
    companyId = await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  try {
    const { bytes, contentType } = await apiClient.files.getHeroImage(companyId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": contentType, "Cache-Control": "no-cache" },
    });
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "No hero image uploaded." }, { status: 404 });
    }
    throw err;
  }
}
