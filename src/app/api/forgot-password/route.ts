import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiClient } from "@/lib/apiClient";
import { sendPasswordResetEmail } from "@/lib/email";
import { getPortalSettings } from "@/lib/settings";

const schema = z.object({
  email: z.string().trim().min(1).email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always respond the same way regardless of whether the account exists,
  // so this endpoint can't be used to enumerate registered emails — admin's
  // requestPasswordReset already returns { token: null } rather than a 404
  // for that reason.
  const { token, user } = await apiClient.portalUsers.requestPasswordReset(email);
  if (token && user) {
    const settings = await getPortalSettings();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      companyName: settings.companyName,
      resetUrl,
    });
  }

  return NextResponse.json({
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
