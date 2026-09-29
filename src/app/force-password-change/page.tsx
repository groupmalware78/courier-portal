import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPortalSettings } from "@/lib/settings";
import { ForcePasswordChangeForm } from "@/components/ForcePasswordChangeForm";
import { BrandMark } from "@/components/BrandMark";

export default async function ForcePasswordChangePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/");

  const settings = await getPortalSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark
            logoUrl={settings.logoUrl}
            logoEmoji={settings.logoEmoji}
            primaryColor={settings.primaryColor}
            className="mx-auto mb-3 h-12 w-12 rounded-xl"
            textClassName="text-2xl"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{settings.companyName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set a new password to finish setting up your account.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md shadow-slate-200/50">
          <ForcePasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
