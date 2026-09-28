import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewManifests } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canViewManifests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const pageSize = Math.min(Math.max(Number(params.get("pageSize")) || 25, 1), 100);
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const companyId = params.get("companyId")?.trim();
  const dateFrom = params.get("dateFrom")?.trim();
  const dateTo = params.get("dateTo")?.trim();
  const invoiceGenerated = params.get("invoiceGenerated")?.trim();

  const where: Prisma.ManifestWhereInput = {};
  if (companyId) where.companyId = companyId;
  if (dateFrom || dateTo) {
    where.generatedAt = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }
  if (invoiceGenerated === "yes") where.invoiceGeneratedAt = { not: null };
  if (invoiceGenerated === "no") where.invoiceGeneratedAt = null;

  const [manifests, total] = await Promise.all([
    prisma.manifest.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    prisma.manifest.count({ where }),
  ]);

  return NextResponse.json({
    manifests,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}
