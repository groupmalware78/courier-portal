import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManagePortal } from "@/lib/rbac";
import { ManifestsView } from "@/components/ManifestsView";
import type { ManifestPackageSnapshot } from "@/lib/manifest";

const PAGE_SIZE = 20;

export default async function AdminManifestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);

  const { manifests, total, totalPages } = await apiClient.manifests.list({ page, pageSize: PAGE_SIZE });

  return (
    <ManifestsView
      key={page}
      initialManifests={manifests.map((m) => ({
        ...m,
        packages: m.packages as ManifestPackageSnapshot[],
      }))}
      pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }}
    />
  );
}
