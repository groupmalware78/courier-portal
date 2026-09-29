import { NextResponse } from "next/server";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canEditPackageCustomer } from "@/lib/rbac";
import { tenantNotConfiguredResponse } from "@/lib/tenant";

// Powers the customer picker in /packages' edit modal — only exposed to
// roles allowed to reassign a package's customer, and scoped to this
// tenant's own customers (implicitly, via the SDK's api key).
export async function GET() {
  const session = await auth();
  if (!session?.user || !canEditPackageCustomer(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { customers } = await apiClient.customers.list({ pageSize: 5000 });
    return NextResponse.json({
      customers: customers.map((c) => ({ id: c.id, name: c.name, email: c.email })),
    });
  } catch (err) {
    if (isApiError(err) && (err.status === 401 || err.status === 403)) {
      return tenantNotConfiguredResponse();
    }
    throw err;
  }
}
