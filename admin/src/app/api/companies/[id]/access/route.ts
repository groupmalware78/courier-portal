import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Access-control settings for a company's API key — scope and rate
// limit. Distinct from the key material itself (see regenerate-key/
// route.ts and ../../route.ts's POST) — this endpoint never touches
// apiKeyHash.
const patchSchema = z.object({
  apiKeyScope: z.enum(["FULL", "READ_ONLY"]),
  requestsPerMinute: z.coerce.number().int().min(0, "Must be 0 or more"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const before = await prisma.company.findUnique({
    where: { id },
    select: {
      apiKeyScope: true,
      requestsPerMinute: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        code: true,
        apiKeyScope: true,
        requestsPerMinute: true,
      },
    });

    await recordAudit({
      entityType: "COMPANY",
      entityId: id,
      action: "UPDATE",
      performedById: session.user.id,
      before,
      after: parsed.data,
    });

    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}
