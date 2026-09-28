import PDFDocument from "pdfkit";

// The Service-Provider platform's own monthly billing invoice to a
// freight forwarder company for its portal lease + hosting cost —
// distinct from manifestInvoicePdf.ts (packages × per-package rate) and
// from ../api's invoicePdf.ts (that company billing its own customer).
export interface PortalInvoicePdfInput {
  invoice: {
    // A human-readable, stable-across-regeneration number derived from
    // the company code + period (e.g. "PORTAL-APP-2026-09") — unlike
    // manifestInvoicePdf.ts's manifest.id, PortalInvoice's own DB id isn't
    // known yet on first generation (Prisma assigns cuid() at insert
    // time), so this is computed by the caller instead of using the row's
    // id.
    number: string;
    period: Date;
  };
  company: {
    name: string;
    code: string;
    contactName: string | null;
    contactEmail: string | null;
    address: string | null;
  };
  portalFeeAmount: number;
  hostingCostAmount: number;
  totalAmount: number;
  // The platform's own bank accounts — see PlatformBankAccount. Every
  // entry passed in is printed (callers should filter to `active` ones);
  // an empty/omitted array means no "Payment information" section is
  // printed, same convention as manifestInvoicePdf.ts.
  bankAccounts?: {
    label: string | null;
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string | null;
    branch: string | null;
  }[];
  // Locked in at generation time from PlatformSettings.paymentDueDays —
  // null means no due-date line is printed.
  dueDate?: Date | null;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

// period is always UTC midnight on the 1st (see normalizePeriod) — format
// in UTC too, or a server west of Greenwich would roll it back a day
// into the previous month (e.g. "2026-09" rendering as "August 2026").
function periodLabel(period: Date): string {
  return period.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function generatePortalInvoicePdf(input: PortalInvoicePdfInput): Promise<Buffer> {
  const { invoice, company, portalFeeAmount, hostingCostAmount, totalAmount, bankAccounts, dueDate } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Freight Forwarder Platform", { continued: false });
    doc.fontSize(10).fillColor("#555555").text("Portal lease & hosting invoice");
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(16).text("Invoice", { align: "right" });
    doc.fontSize(10).fillColor("#555555").text(`Invoice #${invoice.number}`, { align: "right" });
    doc.text(periodLabel(invoice.period), { align: "right" });
    doc.fillColor("#000000");
    doc.moveDown(1);

    doc.fontSize(12).text("Bill to");
    doc.fontSize(10).fillColor("#333333");
    doc.text(`${company.name} (${company.code})`);
    if (company.contactName) doc.text(company.contactName);
    if (company.contactEmail) doc.text(company.contactEmail);
    if (company.address) doc.text(company.address);
    doc.fillColor("#000000");
    doc.moveDown(1.5);

    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Description", 50, tableTop);
    doc.text("Amount", 480, tableTop, { width: 70, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    doc.font("Helvetica");
    let rowY = tableTop + 22;
    doc.text(`Portal lease — ${periodLabel(invoice.period)}`, 50, rowY, { width: 400 });
    doc.text(money(portalFeeAmount), 480, rowY, { width: 70, align: "right" });

    rowY += 20;
    doc.text(`Hosting cost — ${periodLabel(invoice.period)}`, 50, rowY, { width: 400 });
    doc.text(money(hostingCostAmount), 480, rowY, { width: 70, align: "right" });

    doc.moveTo(50, rowY + 25).lineTo(550, rowY + 25).stroke();

    doc.moveDown(3);
    doc.fontSize(10);
    doc.font("Helvetica-Bold").text(`Total due: ${money(totalAmount)}`, 50);
    if (dueDate) {
      doc.text(`Due date: ${dueDate.toLocaleDateString()}`, 50);
    }
    doc.fillColor("#000000");

    if (bankAccounts && bankAccounts.length > 0) {
      doc.moveDown(1.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("Payment information");
      for (const account of bankAccounts) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
        doc.text(account.label || account.bankName);
        doc.font("Helvetica").fontSize(9).fillColor("#333333");
        doc.text(`Bank: ${account.bankName}`);
        doc.text(`Account name: ${account.accountName}`);
        doc.text(`Account number: ${account.accountNumber}`);
        if (account.routingNumber) doc.text(`Routing number: ${account.routingNumber}`);
        if (account.branch) doc.text(`Branch: ${account.branch}`);
      }
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
