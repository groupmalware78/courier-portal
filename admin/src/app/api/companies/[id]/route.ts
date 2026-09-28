import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies } from "@/lib/rbac";
import { companySchema } from "@/lib/companySchema";
import { recordAudit } from "@/lib/audit";

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
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, contactName, contactEmail, contactPhone, address, trn, active } = parsed.data;

  const [nameConflict, emailConflict] = await Promise.all([
    prisma.company.findFirst({ where: { name, NOT: { id } } }),
    prisma.company.findFirst({ where: { contactEmail, NOT: { id } } }),
  ]);
  if (nameConflict) {
    return NextResponse.json(
      { error: "A company with that name already exists." },
      { status: 409 }
    );
  }
  if (emailConflict) {
    return NextResponse.json(
      { error: "A company with that email already exists." },
      { status: 409 }
    );
  }

  try {
    const before = await prisma.company.findUnique({ where: { id } });

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        contactName,
        contactEmail,
        contactPhone,
        address,
        trn: trn || null,
        active: active ?? true,
      },
      // Explicit select — apiKeyHash must never reach the client (see the
      // identical select on the companies dashboard page's initial fetch).
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

    return NextResponse.json({ company });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const deleted = await prisma.company.delete({ where: { id } });

    await recordAudit({
      entityType: "COMPANY",
      entityId: deleted.id,
      action: "DELETE",
      performedById: session.user.id,
      before: deleted,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
