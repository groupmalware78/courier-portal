import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canViewPackages, editablePackageFields } from "@/lib/rbac";
import { PackagesTable } from "@/components/PackagesTable";
import { PackagesFilterBar } from "@/components/PackagesFilterBar";

const PAGE_SIZE = 25;

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canViewPackages(session.user.role)) {
    redirect("/login");
  }

  const { page: pageParam, q, status, dateFrom, dateTo } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);

  // Admin/CSR see every package for this tenant; Drivers see only
  // packages with a delivery assignment routed to them. Filtered on
  // receivedAt (when the package actually arrived at the warehouse), not
  // createdAt (when the DB row was inserted) — packages logged via a bulk
  // import/seed can all share one createdAt moment regardless of when
  // they were really received, which would make a date-range filter on
  // createdAt return everything or nothing.
  const { packages, total, totalPages } = await apiClient.packages.list({
    ...(session.user.role === "DRIVER" ? { driverId: session.user.id } : {}),
    ...(q?.trim() ? { q: q.trim() } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Packages</h1>
        <p className="text-sm text-slate-500">
          {session.user.role === "DRIVER"
            ? "Packages assigned to you for delivery. Click one to update its status."
            : "Every package received for this account. Click one to view or edit details."}
        </p>
      </div>

      <PackagesFilterBar
        initialQ={q ?? ""}
        initialStatus={status ?? ""}
        initialDateFrom={dateFrom ?? ""}
        initialDateTo={dateTo ?? ""}
      />

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            {q || status || dateFrom || dateTo
              ? "No packages match these filters."
              : "No packages to show yet."}
          </p>
        </div>
      ) : (
        <PackagesTable
          key={`${page}-${q ?? ""}-${status ?? ""}-${dateFrom ?? ""}-${dateTo ?? ""}`}
          initialPackages={packages}
          editableFields={editablePackageFields(session.user.role)}
          pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }}
          showCalculateDuties={session.user.role === "ADMIN"}
          role={session.user.role}
        />
      )}
    </div>
  );
}
