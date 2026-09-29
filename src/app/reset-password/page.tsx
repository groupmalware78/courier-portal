import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPortalSettings } from "@/lib/settings";
import { homeRouteForRole } from "@/lib/rbac";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { BrandMark } from "@/components/BrandMark";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(homeRouteForRole(session.user.role));

  const { token } = await searchParams;
  if (!token) redirect("/forgot-password");

  const settings = await getPortalSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <BrandMark
              logoUrl={settings.logoUrl}
              logoEmoji={settings.logoEmoji}
              primaryColor={settings.primaryColor}
              className="mx-auto mb-3 h-12 w-12 rounded-xl"
              textClassName="text-2xl"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{settings.companyName}</h1>
          </Link>
          <p className="mt-1 text-sm text-slate-500">Choose a new password below.</p>
        </div>
        <ResetPasswordForm token={token} />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
