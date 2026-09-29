import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canUseFeeCalculator } from "@/lib/rbac";
import { FeeCalculator } from "@/components/FeeCalculator";

export default async function FeeCalculatorPage() {
  const session = await auth();
  if (!session?.user || !canUseFeeCalculator(session.user.role)) {
    redirect("/login");
  }

  return <FeeCalculator />;
}
