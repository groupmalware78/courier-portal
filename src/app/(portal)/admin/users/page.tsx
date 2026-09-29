import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { StaffView } from "@/components/StaffView";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const [{ users: csr }, { users: drivers }] = await Promise.all([
    apiClient.portalUsers.list({ role: "CSR" }),
    apiClient.portalUsers.list({ role: "DRIVER" }),
  ]);
  const staff = [...csr, ...drivers]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "CSR" | "DRIVER",
      active: u.active,
      createdAt: u.createdAt,
    }));

  return <StaffView initialStaff={staff} />;
}
