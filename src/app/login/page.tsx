import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPortalSettings } from "@/lib/settings";
import { homeRouteForRole } from "@/lib/rbac";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark } from "@/components/BrandMark";
import { GradientBackdrop } from "@/components/GradientBackdrop";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(homeRouteForRole(session.user.role));

  const settings = await getPortalSettings();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <GradientBackdrop
        gradientFrom={settings.gradientFrom}
        gradientVia={settings.gradientVia}
        gradientTo={settings.gradientTo}
      />
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
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          New customer?{" "}
          <Link href="/signup" className="font-medium text-teal-700 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            ← Back to public tracking
          </Link>
        </p>
      </div>
    </div>
  );
}
