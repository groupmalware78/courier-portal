import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { FeesView } from "@/components/FeesView";

export default async function AdminFeesPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const { feeRanges } = await apiClient.feeRanges.list();

  return (
    <FeesView
      initialWeightRanges={feeRanges.filter((r) => r.basis === "WEIGHT")}
      initialValueRanges={feeRanges.filter((r) => r.basis === "VALUE")}
    />
  );
}
