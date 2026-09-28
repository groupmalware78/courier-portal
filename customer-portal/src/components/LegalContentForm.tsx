"use client";

export interface LegalContentFields {
  termsContent: string;
  privacyContent: string;
}

// Shown as placeholder text so admins see the expected format (numbered
// section, blank line, body paragraph) before typing anything — this is
// example copy, not real legal text, and is never saved (placeholders
// never submit).
const TERMS_PLACEHOLDER = `Leave blank to use the default terms and conditions, or write your own — for example:

1. Acceptance of terms

By creating an account with, or otherwise using the services of, [Company Name] ("we", "us", or "our"), you agree to be bound by these Terms and Conditions.

2. Our services

We provide freight forwarding, package receiving, and shipment tracking services between our warehouse locations and the destination address you provide.

3. Customs, duties, and taxes

You are solely responsible for any customs duties, taxes, or fees assessed on your shipments by the relevant government authority.`;

const PRIVACY_PLACEHOLDER = `Leave blank to use the default privacy policy, or write your own — for example:

1. Information we collect

When you create an account or use our services, we collect information you provide directly, such as your name, email address, phone number, and Tax Registration Number (TRN).

2. How we use your information

We use your information to create and manage your account, process and track your shipments, and communicate with you about your packages.

3. How we share your information

We share your information only as needed to provide our services. We do not sell your personal information to third parties.`;

export function LegalContentForm({
  value,
  onChange,
}: {
  value: LegalContentFields;
  onChange: (value: LegalContentFields) => void;
}) {
  function updateField(field: keyof LegalContentFields, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  const textareaClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/50">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Legal content</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Plain text, one paragraph per line — leave a field blank to show the default terms/
          privacy content instead of writing your own.
        </p>
      </div>

      <div>
        <label htmlFor="termsContent" className="mb-1 block text-sm font-medium text-slate-700">
          Terms and Conditions
        </label>
        <textarea
          id="termsContent"
          rows={14}
          placeholder={TERMS_PLACEHOLDER}
          value={value.termsContent}
          onChange={(e) => updateField("termsContent", e.target.value)}
          className={textareaClass}
        />
      </div>

      <div>
        <label htmlFor="privacyContent" className="mb-1 block text-sm font-medium text-slate-700">
          Privacy Policy
        </label>
        <textarea
          id="privacyContent"
          rows={14}
          placeholder={PRIVACY_PLACEHOLDER}
          value={value.privacyContent}
          onChange={(e) => updateField("privacyContent", e.target.value)}
          className={textareaClass}
        />
      </div>
    </div>
  );
}
