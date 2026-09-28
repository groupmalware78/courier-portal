import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import {
  canViewPackages,
  editablePackageFields,
  allowedStatusValues,
  DUTY_FIELDS,
  DUTY_MIN_DECLARED_VALUE,
  type EditablePackageField,
} from "@/lib/rbac";
import { getTenantCompanyId, TenantNotConfiguredError, tenantNotConfiguredResponse } from "@/lib/tenant";

const PACKAGE_STATUS_VALUES = [
  "RECEIVED",
  "SHIPPED",
  "AT_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DAMAGED",
  "EMPTY_PACKAGE",
  "RETURNED",
] as const;
const PACKAGE_TYPE_VALUES = ["BOX", "BAG", "ENVELOPE", "OTHER"] as const;
const PAYMENT_STATUS_VALUES = ["UNPAID", "PARTIAL", "PAID"] as const;

const patchSchema = z.object({
  status: z.enum(PACKAGE_STATUS_VALUES).optional(),
  packageType: z.enum(PACKAGE_TYPE_VALUES).optional(),
  weightLbs: z.coerce.number().positive("Weight must be greater than 0").optional().nullable(),
  pieces: z.coerce.number().int().positive("Pieces must be at least 1").optional(),
  description: z.string().trim().max(500).optional().nullable(),
  declaredValue: z.coerce.number().min(0, "Declared value must be 0 or more").optional().nullable(),
  customerId: z.string().trim().min(1).optional().nullable(),
  rate: z.coerce.number().min(0, "Rate must be 0 or more").optional().nullable(),
  cost: z.coerce.number().min(0, "Cost must be 0 or more").optional().nullable(),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
  amountPaid: z.coerce.number().min(0, "Amount paid must be 0 or more").optional().nullable(),
  dutyImportDuty: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyStampDuty: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyAdditionalStampDuty: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyGct: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutySct: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyStandardComplianceFee: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyEnvironmentalLevy: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
  dutyCustomsAdminFee: z.coerce.number().min(0, "Duty percentage must be 0 or more").optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canViewPackages(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedFields = editablePackageFields(session.user.role);
  if (allowedFields.length === 0) {
    return NextResponse.json(
      { error: "You do not have permission to edit packages." },
      { status: 403 }
    );
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

  const requestedFields = Object.keys(parsed.data) as EditablePackageField[];
  const disallowed = requestedFields.filter((field) => !allowedFields.includes(field));
  if (disallowed.length > 0) {
    return NextResponse.json(
      { error: `You are not allowed to edit: ${disallowed.join(", ")}` },
      { status: 403 }
    );
  }

  const statusRestriction = allowedStatusValues(session.user.role);
  if (parsed.data.status !== undefined && statusRestriction && !statusRestriction.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `You may only set status to: ${statusRestriction.join(", ")}` },
      { status: 403 }
    );
  }

  try {
    await getTenantCompanyId();
  } catch (err) {
    if (err instanceof TenantNotConfiguredError) return tenantNotConfiguredResponse();
    throw err;
  }

  if (session.user.role === "DRIVER") {
    const { deliveries } = await apiClient.deliveryAssignments.list({ driverId: session.user.id, packageId: id });
    if (deliveries.length === 0) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }
  }

  // Duties only make sense once a package's declared value clears the
  // threshold (see DUTY_MIN_DECLARED_VALUE) — check against whatever
  // declaredValue this same request is setting, falling back to the
  // package's current value when it isn't included here.
  const requestedDuties = DUTY_FIELDS.filter(
    (field) => parsed.data[field] !== undefined && parsed.data[field] !== null
  );
  if (requestedDuties.length > 0) {
    const effectiveDeclaredValue =
      parsed.data.declaredValue !== undefined
        ? parsed.data.declaredValue
        : (await apiClient.packages.get(id)).package.declaredValue;
    if (effectiveDeclaredValue == null || effectiveDeclaredValue < DUTY_MIN_DECLARED_VALUE) {
      return NextResponse.json(
        {
          error: `Duties can only be entered for packages with a declared value of $${DUTY_MIN_DECLARED_VALUE} or more.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const { package: updated } = await apiClient.packages.update(id, {
      ...parsed.data,
      changedByLabel: `${session.user.name} (${session.user.role})`,
    });
    return NextResponse.json({ package: updated });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
