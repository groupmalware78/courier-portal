import Link from "next/link";
import { getPortalSettings } from "@/lib/settings";
import { getTenantCompanyIdOrNull } from "@/lib/tenant";
import { apiClient } from "@/lib/apiClient";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { ContactForm } from "@/components/ContactForm";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";

export default async function ContactPage() {
  const companyId = await getTenantCompanyIdOrNull();
  const [settings, locationsResult] = await Promise.all([
    getPortalSettings(),
    companyId ? apiClient.locations.list({ activeOnly: true }) : Promise.resolve({ locations: [] }),
  ]);
  const locations = locationsResult.locations;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BrandMark
              logoUrl={settings.logoUrl}
              logoEmoji={settings.logoEmoji}
              primaryColor={settings.primaryColor}
              className="h-8 w-8 rounded-lg"
              textClassName="text-lg"
            />
            {settings.companyName}
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
            ← Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contact Us</h1>
          <p className="mt-2 text-sm text-slate-500">
            Questions about a shipment, pricing, or your account? Reach out below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            {(settings.contactEmail || settings.contactPhone) && (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md shadow-slate-200/50">
                <h2 className="text-sm font-semibold text-slate-900">Get in touch</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {settings.contactEmail && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="font-medium text-slate-900">{settings.contactEmail}</dd>
                    </div>
                  )}
                  {settings.contactPhone && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="font-medium text-slate-900">{formatPhoneDisplay(settings.contactPhone)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {locations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Our locations</h2>
                {locations.map((loc) => (
                  <div key={loc.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md shadow-slate-200/50">
                    <p className="text-sm font-medium text-slate-900">{loc.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{loc.address}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatPhoneDisplay(loc.contactNumber)}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Mon–Fri: {loc.hoursMonFri} · Sat: {loc.hoursSat}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ContactForm />
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  );
}
