import Link from "next/link";
import { getPortalSettings } from "@/lib/settings";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";

export default async function TermsPage() {
  const settings = await getPortalSettings();

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

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Terms and Conditions</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {settings.termsContent ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {settings.termsContent}
          </div>
        ) : (
          <div className="space-y-8 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-semibold text-slate-900">1. Acceptance of terms</h2>
              <p className="mt-2">
                By creating an account with, or otherwise using the services of, {settings.companyName}{" "}
                (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these
                Terms and Conditions. If you do not agree to these terms, do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">2. Our services</h2>
              <p className="mt-2">
                We provide freight forwarding, package receiving, and shipment tracking services between
                our warehouse locations and the destination address you provide. Shipping rates, transit
                times, and service availability are as described on this portal and may change without
                prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">3. Account registration</h2>
              <p className="mt-2">
                You must provide accurate, current, and complete information when registering for an
                account, including your legal name and a valid Tax Registration Number (TRN) where
                required for customs purposes. You are responsible for maintaining the confidentiality of
                your account credentials and for all activity that occurs under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">4. Prohibited and restricted items</h2>
              <p className="mt-2">
                You agree not to ship any item that is illegal, hazardous, or prohibited by the customs
                regulations of the origin or destination country. We reserve the right to inspect, refuse,
                hold, or return any package that we reasonably believe violates this policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">5. Customs, duties, and taxes</h2>
              <p className="mt-2">
                You are solely responsible for any customs duties, taxes, or fees assessed on your
                shipments by the relevant government authority. We are not responsible for delays caused
                by customs processing.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">6. Payment and fees</h2>
              <p className="mt-2">
                Shipping costs are calculated based on the weight-based rates published on this portal at
                the time your package is processed. Fees must be paid in full before a package is released
                for pickup or delivery.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">7. Limitation of liability</h2>
              <p className="mt-2">
                To the fullest extent permitted by law, our liability for any lost, damaged, or delayed
                shipment is limited to the declared value of the package or the amount paid for shipping,
                whichever is lower. We are not liable for indirect, incidental, or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">8. Changes to these terms</h2>
              <p className="mt-2">
                We may update these Terms and Conditions from time to time. Continued use of our services
                after any changes take effect constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">9. Contact us</h2>
              <p className="mt-2">
                Questions about these terms? Reach out via our{" "}
                <Link href="/contact" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900">
                  contact page
                </Link>
                .
              </p>
            </section>
          </div>
        )}
      </main>

      <Footer settings={settings} />
    </div>
  );
}
