import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePortalFee } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManagePortalFee(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invoice = await prisma.portalInvoice.findUnique({
    where: { id },
    select: { invoicePdf: true, invoiceFileName: true },
  });
  if (!invoice?.invoicePdf) {
    return NextResponse.json({ error: "No invoice generated." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(invoice.invoicePdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceFileName ?? "invoice.pdf"}"`,
    },
  });
}
