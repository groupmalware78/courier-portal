import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { canManageDeliveries, canAssignDeliveries } from "@/lib/rbac";

// Field-set-driven, same pattern as /api/packages/[id]: which fields a
// caller may send depends on their role, checked below rather than with
// one blanket permission for the whole route.
const updateSchema = z.object({
  status: z.enum(["REQUESTED", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"]).optional(),
  driverId: z.string().min(1).optional(),
  addressLine1: z.string().trim().min(1).max(150).optional(),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  cityParish: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { status, driverId, addressLine1, addressLine2, cityParish, country } = parsed.data;
  const editingAddress = addressLine1 !== undefined || addressLine2 !== undefined || cityParish !== undefined || country !== undefined;

  const { delivery: assignment } = await apiClient.deliveryAssignments.get(id).catch(() => ({ delivery: null }));
  if (!assignment) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }

  if (status !== undefined) {
    if (!canManageDeliveries(session.user.role)) {
      return NextResponse.json({ error: "You do not have permission to update delivery status." }, { status: 403 });
    }
    // Drivers may only progress their own assignments; admins may update any.
    if (session.user.role === "DRIVER" && assignment.driverId !== session.user.id) {
      return NextResponse.json({ error: "This delivery isn't assigned to you." }, { status: 403 });
    }
  }

  if (driverId !== undefined && !canAssignDeliveries(session.user.role)) {
    return NextResponse.json({ error: "You do not have permission to assign a driver." }, { status: 403 });
  }

  if (editingAddress) {
    const isRequester = session.user.role === "CUSTOMER" && assignment.requestedById === session.user.id;
    if (!isRequester && !canAssignDeliveries(session.user.role)) {
      return NextResponse.json({ error: "You do not have permission to edit the delivery address." }, { status: 403 });
    }
  }

  try {
    const { delivery } = await apiClient.deliveryAssignments.update(id, {
      status,
      driverId,
      addressLine1,
      addressLine2,
      cityParish,
      country,
    });
    return NextResponse.json({ assignment: delivery });
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }
    throw err;
  }
}
