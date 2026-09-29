import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { PHONE_FORMAT_REGEX } from "@/lib/phoneFormat";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
      message: "Enter a phone number in the format +1 (000) 000-0000",
    }),
  relationship: z.string().trim().max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { people } = await apiClient.authorizedPickups.list(session.user.id);
  return NextResponse.json({ people });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { person } = await apiClient.authorizedPickups.create(session.user.id, {
    name: parsed.data.name,
    phone: parsed.data.phone || undefined,
    relationship: parsed.data.relationship || undefined,
  });

  return NextResponse.json({ person }, { status: 201 });
}
