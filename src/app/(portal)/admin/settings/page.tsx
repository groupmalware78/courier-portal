import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManagePortal } from "@/lib/rbac";
import { getPortalSettings, getEmailProviderStatus } from "@/lib/settings";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const [settings, emailProviderStatus] = await Promise.all([
    getPortalSettings(),
    getEmailProviderStatus(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal Settings</h1>
        <p className="text-sm text-slate-500">
          Customize this portal&apos;s branding and content.
        </p>
      </div>
      <AdminSettingsForm initial={settings} initialEmailProvider={emailProviderStatus} />
    </div>
  );
}
