import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCompanies, canViewDirectories } from "@/lib/rbac";
import { companySchema } from "@/lib/companySchema";
import { recordAudit } from "@/lib/audit";
import { generateOtp } from "@/lib/otp";
import { sendCompanyRegistrationEmail } from "@/lib/email";
import { generateApiKey, hashApiKey, apiKeyPreview } from "@/lib/apiKeyHash";

// Read-only company directory for the package edit/log forms' company
// picker (PackageEditModal.tsx) — same gate as GET /api/customers. Never
// existed before the Warehouse app was merged in, since admin's own
// Companies page fetches directly via Prisma server-side rather than this
// route; PackageEditModal's picker has been silently 405-ing since the
// merge until this was added.
export async function GET() {
  const session = await auth();
  if (!session?.user || !canViewDirectories(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return NextResponse.json({ companies });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageCompanies(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { code, name, contactName, contactEmail, contactPhone, address, trn } = parsed.data;
  if (!code) {
    return NextResponse.json({ error: "Company code is required." }, { status: 400 });
  }

  const [nameConflict, emailConflict, codeConflict] = await Promise.all([
    prisma.company.findUnique({ where: { name } }),
    prisma.company.findUnique({ where: { contactEmail } }),
    prisma.company.findUnique({ where: { code } }),
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
  if (codeConflict) {
    return NextResponse.json(
      { error: "A company with that code already exists." },
      { status: 409 }
    );
  }

  const apiKey = generateApiKey();

  let company;
  try {
    company = await prisma.company.create({
      data: {
        name,
        code,
        apiKeyHash: hashApiKey(apiKey),
        apiKeyPrefix: apiKeyPreview(apiKey),
        apiKeyRotatedAt: new Date(),
        contactName,
        contactEmail,
        contactPhone,
        address,
        trn: trn || undefined,
      },
      // Explicit select — apiKeyHash must never reach the client (see the
      // identical select on the companies dashboard page's fetch).
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
  } catch (err) {
    // The findUnique checks above only catch the common case — two
    // requests racing with the same code (or name/email) can both pass
    // those checks before either write lands. The database's own @unique
    // constraint is the actual source of truth; translate its violation
    // into the same friendly conflict response instead of letting it
    // surface as an unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : String(err.meta?.target ?? "");
      const field = target.includes("code")
        ? "code"
        : target.includes("contactEmail")
          ? "email"
          : target.includes("name")
            ? "name"
            : "details";
      return NextResponse.json({ error: `A company with that ${field} already exists.` }, { status: 409 });
    }
    throw err;
  }

  await recordAudit({
    entityType: "COMPANY",
    entityId: company.id,
    action: "CREATE",
    performedById: session.user.id,
    after: company,
  });

  // Provision this company's initial customer-portal admin: an OTP as
  // their password, forced to change it on first login. Upsert rather
  // than create — re-registering with an email that already has a portal
  // account (e.g. retrying after an email-send failure) just issues a
  // fresh OTP instead of erroring.
  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(otp, 10);

  await prisma.portalUser.upsert({
    where: { companyId_email: { companyId: company.id, email: contactEmail } },
    update: { passwordHash, role: "ADMIN", mustChangePassword: true },
    create: {
      companyId: company.id,
      name: contactName,
      email: contactEmail,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  const { sent } = await sendCompanyRegistrationEmail({
    to: contactEmail,
    contactName,
    companyName: name,
    companyCode: code,
    apiKey,
    otp,
  });

  return NextResponse.json(
    // apiKey (raw) is returned once here for CompaniesView's one-time
    // reveal banner — it's never stored or retrievable again after this
    // response, only apiKeyHash/apiKeyPrefix are persisted.
    { company, apiKey, emailSent: sent, ...(sent ? {} : { otp }) },
    { status: 201 }
  );
}
