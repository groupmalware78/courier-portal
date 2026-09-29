import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManageDeliveries, canAssignDeliveries, canViewDeliveriesPage } from "@/lib/rbac";
import { DeliveryList } from "@/components/DeliveryList";

const PAGE_SIZE = 25;

export default async function DriverPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canViewDeliveriesPage(session.user.role)) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const role = session.user.role;
  // ADMIN/CSR see every delivery for the tenant (and, for CSR, can only
  // assign — not progress status); DRIVER sees just their own.
  const isStaffView = role === "ADMIN" || role === "CSR";
  const canAssign = canAssignDeliveries(role);
  const canProgress = canManageDeliveries(role);

  const [{ deliveries, total, totalPages }, drivers] = await Promise.all([
    apiClient.deliveryAssignments.list({
      driverId: isStaffView ? undefined : session.user.id,
      page,
    }),
    canAssign ? apiClient.portalUsers.list({ role: "DRIVER" }) : Promise.resolve({ users: [] }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isStaffView ? "All Deliveries" : "My Deliveries"}
        </h1>
        <p className="text-sm text-slate-500">
          {isStaffView
            ? "Every delivery request and assignment for this account."
            : "Shipments assigned to you for delivery."}
        </p>
      </div>
      <DeliveryList
        key={page}
        initialDeliveries={deliveries.map((d) => ({
          id: d.id,
          status: d.status,
          notes: d.notes,
          assignedAt: d.assignedAt,
          deliveredAt: d.deliveredAt,
          addressLine1: d.addressLine1,
          addressLine2: d.addressLine2,
          cityParish: d.cityParish,
          country: d.country,
          package: { trackingNumber: d.package?.trackingNumber ?? "" },
          driver: d.driver ? { id: d.driver.id, name: d.driver.name } : null,
        }))}
        showDriverColumn={isStaffView}
        canAssign={canAssign}
        canProgress={canProgress}
        currentDriverId={role === "DRIVER" ? session.user.id : null}
        availableDrivers={drivers.users.map((u) => ({ id: u.id, name: u.name }))}
        pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }}
      />
    </div>
  );
}
