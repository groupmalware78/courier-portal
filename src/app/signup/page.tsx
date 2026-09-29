import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPortalSettings } from "@/lib/settings";
import { homeRouteForRole } from "@/lib/rbac";
import { SignupForm } from "@/components/SignupForm";
import { BrandMark } from "@/components/BrandMark";
import { GradientBackdrop } from "@/components/GradientBackdrop";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect(homeRouteForRole(session.user.role));

  const settings = await getPortalSettings();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <GradientBackdrop
        gradientFrom={settings.gradientFrom}
        gradientVia={settings.gradientVia}
        gradientTo={settings.gradientTo}
      />
      <div className="w-full max-w-2xl">
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
          <p className="mt-1 text-sm text-slate-500">Create your customer account</p>
        </div>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
