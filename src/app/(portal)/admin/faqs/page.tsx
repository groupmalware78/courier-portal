import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { FaqsView } from "@/components/FaqsView";

export default async function AdminFaqsPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const { faqs } = await apiClient.faqs.list();

  return <FaqsView initialFaqs={faqs} />;
}
