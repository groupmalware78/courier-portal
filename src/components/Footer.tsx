import Link from "next/link";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { BrandMark } from "@/components/BrandMark";

interface FooterSettings {
  companyName: string;
  logoUrl: string | null;
  logoEmoji: string;
  primaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export function Footer({ settings }: { settings: FooterSettings }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 text-center">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BrandMark
            logoUrl={settings.logoUrl}
            logoEmoji={settings.logoEmoji}
            primaryColor={settings.primaryColor}
            className="h-6 w-6 rounded-md"
            textClassName="text-sm"
          />
          {settings.companyName}
        </Link>
        {(settings.contactEmail || settings.contactPhone) && (
          <p className="text-xs text-slate-400">
            {settings.contactEmail && <span>{settings.contactEmail}</span>}
            {settings.contactEmail && settings.contactPhone && " · "}
            {settings.contactPhone && <span>{formatPhoneDisplay(settings.contactPhone)}</span>}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-teal-700">
          <Link href="/contact" className="underline underline-offset-2 hover:text-teal-900">
            Contact us
          </Link>
          <Link href="/terms" className="underline underline-offset-2 hover:text-teal-900">
            Terms and Conditions
          </Link>
          <Link href="/privacy" className="underline underline-offset-2 hover:text-teal-900">
            Privacy Policy
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          © {new Date().getFullYear()} {settings.companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
