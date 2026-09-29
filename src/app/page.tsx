import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { getPortalSettings } from "@/lib/settings";
import { homeRouteForRole } from "@/lib/rbac";
import { getTenantCompanyIdOrNull } from "@/lib/tenant";
import { apiClient } from "@/lib/apiClient";
import { TrackingForm } from "@/components/TrackingForm";
import { RatesCalculator } from "@/components/RatesCalculator";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";

const TRUST_BADGES = [
  {
    icon: (
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    ),
    label: "Real-time tracking",
  },
  {
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </>
    ),
    label: "Secure handling",
  },
  {
    icon: (
      <>
        <path d="M20 13V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
        <path d="m17 17 4 4m-4 0 4-4" />
      </>
    ),
    label: "Fast, transparent shipping",
  },
];

export default async function Home() {
  const companyId = await getTenantCompanyIdOrNull();
  const [session, settings, ratesResult, faqsResult] = await Promise.all([
    auth(),
    getPortalSettings(),
    companyId ? apiClient.shippingRates.list() : Promise.resolve({ rates: [] }),
    companyId ? apiClient.faqs.list({ activeOnly: true }) : Promise.resolve({ faqs: [] }),
  ]);
  const rates = ratesResult.rates;
  const faqs = faqsResult.faqs;
  const dashboardHref = session?.user ? homeRouteForRole(session.user.role) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <BrandMark
              logoUrl={settings.logoUrl}
              logoEmoji={settings.logoEmoji}
              primaryColor={settings.primaryColor}
              className="h-8 w-8 rounded-lg"
              textClassName="text-lg"
            />
            {settings.companyName}
          </Link>
          <div className="flex items-center gap-2">
            {rates.length > 0 && (
              <a
                href="#rates"
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition hover:text-white sm:inline-block"
              >
                Rates
              </a>
            )}
            {faqs.length > 0 && (
              <a
                href="#faq"
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition hover:text-white sm:inline-block"
              >
                FAQ
              </a>
            )}
            <Link
              href="/contact"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition hover:text-white sm:inline-block"
            >
              Contact
            </Link>
            {dashboardHref ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </form>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center px-4 sm:px-6"
        style={
          settings.heroImageUrl
            ? { backgroundImage: `url(${settings.heroImageUrl})` }
            : {
                background: `linear-gradient(to bottom right, ${settings.gradientFrom}, ${settings.gradientVia}, ${settings.gradientTo})`,
              }
        }
      >
        {settings.heroImageUrl && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom right, ${settings.gradientFrom}CC, ${settings.gradientVia}B3, ${settings.gradientTo}B3)`,
            }}
          />
        )}
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            Freight forwarding, made simple
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {settings.companyName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            {settings.welcomeMessage ??
              "Track every shipment in real time, from pickup to your door."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#track"
              className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:opacity-90"
            >
              Track a shipment
            </a>
            <Link
              href={dashboardHref ?? "/signup"}
              className="rounded-md border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {dashboardHref ? "Go to dashboard" : "Create an account"}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="relative mx-auto -mt-12 max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:grid-cols-3 sm:p-6">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4.5 w-4.5"
                >
                  {badge.icon}
                </svg>
              </span>
              <span className="text-sm font-medium text-slate-700">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tracking widget */}
      <section id="track" className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Track your shipment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your tracking number to see its latest status.
          </p>
        </div>
        <TrackingForm />
      </section>

      <RatesCalculator
        rates={rates.map((r) => ({
          id: r.id,
          label: r.label,
          minWeightLbs: r.minWeightLbs,
          maxWeightLbs: r.maxWeightLbs,
          price: r.price,
        }))}
      />

      {/* FAQ */}
      {faqs.length > 0 && (
        <section id="faq" className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Frequently asked questions</h2>
          </div>
          <FaqAccordion faqs={faqs} />
        </section>
      )}

      <Footer settings={settings} />
    </div>
  );
}
