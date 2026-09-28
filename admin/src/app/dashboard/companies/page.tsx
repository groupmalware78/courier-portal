import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { CompaniesView } from "@/components/CompaniesView";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    redirect("/dashboard");
  }

  // Explicit select — apiKeyHash must never reach the client, even
  // serialized into an RSC payload.
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      apiKeyPrefix: true,
      apiKeyScope: true,
      apiKeyRotatedAt: true,
      requestsPerMinute: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      trn: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return <CompaniesView initialCompanies={JSON.parse(JSON.stringify(companies))} />;
}
