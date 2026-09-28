// PortalInvoice.period is always normalized to the 1st of the month at
// UTC midnight, so a company can have at most one invoice per calendar
// month (see the @@unique([companyId, period]) on that model) regardless
// of what day-of-month the client's "YYYY-MM" or "YYYY-MM-DD" value maps
// to in local time.
export function normalizePeriod(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function periodToInputValue(period: Date): string {
  return `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}`;
}
