import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { generateApiKey, hashApiKey, apiKeyPreview } from "@/lib/apiKeyHash";

// Issues a new API key for a company, invalidating the old one
// immediately — the existing customer-portal deployment using the old
// key will start failing right away until its TENANT_API_KEY is updated.
// This is how a leaked key gets revoked; it's a hard cutover by design,
// not a scheduled/self-service rotation (that feature was removed —
// there is no grace period and no tenant-side self-service flow anymore).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const before = await prisma.company.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const rawKey = generateApiKey();

    const company = await prisma.company.update({
      where: { id },
      data: {
        apiKeyHash: hashApiKey(rawKey),
        apiKeyPrefix: apiKeyPreview(rawKey),
        apiKeyRotatedAt: new Date(),
      },
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

    await recordAudit({
      entityType: "COMPANY",
      entityId: company.id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: company,
    });

    // apiKey (raw) is returned once for CompaniesView's one-time reveal
    // banner — see the identical pattern in ../../route.ts's POST.
    return NextResponse.json({ company, apiKey: rawKey });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
