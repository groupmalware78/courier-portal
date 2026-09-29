import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { issueVerificationEmail } from "@/lib/emailVerification";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await apiClient.portalUsers.get(session.user.id);
  if (user.emailVerified) {
    return NextResponse.json({ error: "This email is already verified." }, { status: 400 });
  }

  const { customer } = await apiClient.customers.byEmail(user.email);

  const { sent } = await issueVerificationEmail(user, { customerCode: customer?.customerCode });
  return NextResponse.json({ sent });
}
