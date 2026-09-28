import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";
import { ManifestsView } from "@/components/ManifestsView";

const PAGE_SIZE = 25;

export default async function ManifestsPage() {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    redirect("/dashboard");
  }

  const [manifests, total, companies] = await Promise.all([
    prisma.manifest.findMany({
      orderBy: { generatedAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        generatedAt: true,
        packageCount: true,
        triggeredBy: true,
        invoiceAmount: true,
        invoiceGeneratedAt: true,
        invoicePaidAt: true,
        company: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.manifest.count(),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <ManifestsView
      initialManifests={JSON.parse(JSON.stringify(manifests))}
      initialPagination={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
      }}
      companies={companies}
    />
  );
}
