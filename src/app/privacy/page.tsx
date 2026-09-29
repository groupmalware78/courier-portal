import Link from "next/link";
import { getPortalSettings } from "@/lib/settings";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";

export default async function PrivacyPage() {
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {settings.privacyContent ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {settings.privacyContent}
          </div>
        ) : (
          <div className="space-y-8 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-semibold text-slate-900">1. Information we collect</h2>
              <p className="mt-2">
                When you create an account or use our services, we collect information you provide
                directly, such as your name, email address, phone number, mailing address, Tax
                Registration Number (TRN), and package/shipment details. We also automatically collect
                basic technical information, such as your browser type and IP address, to keep our
                services secure and functioning correctly.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">2. How we use your information</h2>
              <p className="mt-2">
                We use your information to create and manage your account, process and track your
                shipments, calculate shipping costs, communicate with you about your packages, comply with
                customs and legal requirements, and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">3. How we share your information</h2>
              <p className="mt-2">
                We share your information only as needed to provide our services — for example, with
                customs authorities where required, and with delivery personnel to complete your shipment.
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">4. Data retention</h2>
              <p className="mt-2">
                We retain your account and shipment information for as long as your account is active, or
                as needed to comply with our legal and customs record-keeping obligations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">5. Data security</h2>
              <p className="mt-2">
                We use reasonable administrative and technical safeguards to protect your information,
                including encrypted password storage. No method of transmission or storage is completely
                secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">6. Your choices</h2>
              <p className="mt-2">
                You may review and update your account information at any time by signing in. To request
                deletion of your account or personal information, contact us using the details below.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">7. Changes to this policy</h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. Continued use of our services after
                any changes take effect constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">8. Contact us</h2>
              <p className="mt-2">
                Questions about this policy or your personal information? Reach out via our{" "}
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
