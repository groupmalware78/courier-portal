import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { getPortalSettings } from "@/lib/settings";
import { PortalNav } from "@/components/PortalNav";
import { GradientBackdrop } from "@/components/GradientBackdrop";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // The session's `name` is baked into the JWT at login and won't reflect a
  // later profile edit until re-login — read it fresh from the database so
  // a name change shows up immediately (via router.refresh()) instead.
  const [settings, { user: currentUser }] = await Promise.all([
    getPortalSettings(),
    apiClient.portalUsers.get(session.user.id),
  ]);

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      <GradientBackdrop
        gradientFrom={settings.gradientFrom}
        gradientVia={settings.gradientVia}
        gradientTo={settings.gradientTo}
      />
      <PortalNav
        user={{ ...session.user, name: currentUser?.name ?? session.user.name }}
        companyName={settings.companyName}
        logoEmoji={settings.logoEmoji}
        logoUrl={settings.logoUrl}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 print:h-auto print:overflow-visible print:px-0 print:py-0">
        <div className="mx-auto max-w-5xl print:max-w-none">{children}</div>
      </main>
    </div>
  );
}
