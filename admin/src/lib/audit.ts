import type { AuditAction, AuditEntity, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Fields that should never be written to the audit trail, regardless of
// entity type (e.g. password hashes, API key material). apiKeyPrefix is
// intentionally NOT here — it's a display value, not a secret.
const REDACTED_FIELDS = new Set([
  "passwordHash",
  "apiKeyHash",
]);

function redact(record: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | null {
  if (!record) return null;
  const filtered = Object.fromEntries(
    Object.entries(record).filter(([key]) => !REDACTED_FIELDS.has(key))
  );
  // Round-trip through JSON to coerce non-JSON values (e.g. Date objects
  // from Prisma models) into plain, storable JSON.
  return JSON.parse(JSON.stringify(filtered));
}

export async function recordAudit(params: {
  entityType: AuditEntity;
  entityId: string;
  action: AuditAction;
  performedById: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedById: params.performedById,
        changes: {
          before: redact(params.before),
          after: redact(params.after),
        },
      },
    });
  } catch (err) {
    // Audit logging is best-effort: a logging failure must never break the
    // underlying CRUD operation it's recording.
    console.error("Failed to record audit log entry:", err);
  }
}
