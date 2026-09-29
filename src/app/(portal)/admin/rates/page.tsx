import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { RatesView } from "@/components/RatesView";

export default async function AdminRatesPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const { rates } = await apiClient.shippingRates.list();

  return <RatesView initialRates={rates} />;
}
