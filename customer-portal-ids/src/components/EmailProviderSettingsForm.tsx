"use client";

import { useState } from "react";
import { PasswordInput } from "./PasswordInput";

export interface EmailProviderFields {
  emailProvider: "RESEND" | "SMTP" | "PLATFORM_DEFAULT";
  emailFromAddress: string;
  // Blank = keep the existing stored secret — see emailProviderSchema.ts.
  resendApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpSecure: boolean;
  smtpPassword: string;
}

export function EmailProviderSettingsForm({
  value,
  onChange,
  hasSecretConfigured,
}: {
  value: EmailProviderFields;
  onChange: (value: EmailProviderFields) => void;
  hasSecretConfigured: boolean;
}) {
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function updateField<K extends keyof EmailProviderFields>(field: K, fieldValue: EmailProviderFields[K]) {
    setTestResult(null);
    onChange({ ...value, [field]: fieldValue });
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, ...value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ ok: false, message: data.error ?? "Failed to send test email." });
      } else if (data.error) {
        setTestResult({ ok: false, message: data.error });
      } else if (data.sent) {
        setTestResult({ ok: true, message: `Test email sent to ${testEmail}.` });
      } else {
        setTestResult({
          ok: false,
          message: "Nothing was sent — this provider isn't fully configured yet.",
        });
      }
    } finally {
      setTesting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Email provider</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Where signup verification, password reset, contact-form, and package-ready emails are
          sent from. Leave on Platform default to use the shared email service.
        </p>
      </div>

      <div>
        <label htmlFor="emailProvider" className="mb-1 block text-sm font-medium text-slate-700">
          Provider
        </label>
        <select
          id="emailProvider"
          value={value.emailProvider}
          onChange={(e) => updateField("emailProvider", e.target.value as EmailProviderFields["emailProvider"])}
          className={inputClass}
        >
          <option value="PLATFORM_DEFAULT">Platform default</option>
          <option value="RESEND">Resend</option>
          <option value="SMTP">SMTP</option>
        </select>
      </div>

      {value.emailProvider !== "PLATFORM_DEFAULT" && (
        <div>
          <label htmlFor="emailFromAddress" className="mb-1 block text-sm font-medium text-slate-700">
            From address
          </label>
          <input
            id="emailFromAddress"
            type="email"
            placeholder="notifications@yourdomain.com"
            value={value.emailFromAddress}
            onChange={(e) => updateField("emailFromAddress", e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {value.emailProvider === "RESEND" && (
        <div>
          <label htmlFor="resendApiKey" className="mb-1 block text-sm font-medium text-slate-700">
            Resend API key
          </label>
          <PasswordInput
            id="resendApiKey"
            placeholder={hasSecretConfigured ? "•••• configured — enter a new key to replace" : "re_..."}
            value={value.resendApiKey}
            onChange={(e) => updateField("resendApiKey", e.target.value)}
            wrapperClassName="w-full"
            className={inputClass}
          />
        </div>
      )}

      {value.emailProvider === "SMTP" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="smtpHost" className="mb-1 block text-sm font-medium text-slate-700">
                Host
              </label>
              <input
                id="smtpHost"
                placeholder="smtp.yourdomain.com"
                value={value.smtpHost}
                onChange={(e) => updateField("smtpHost", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="smtpPort" className="mb-1 block text-sm font-medium text-slate-700">
                Port
              </label>
              <input
                id="smtpPort"
                inputMode="numeric"
                placeholder="587"
                value={value.smtpPort}
                onChange={(e) => updateField("smtpPort", e.target.value.replace(/[^0-9]/g, ""))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="smtpUsername" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="smtpUsername"
              value={value.smtpUsername}
              onChange={(e) => updateField("smtpUsername", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="smtpPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <PasswordInput
              id="smtpPassword"
              placeholder={hasSecretConfigured ? "•••• configured — enter a new password to replace" : ""}
              value={value.smtpPassword}
              onChange={(e) => updateField("smtpPassword", e.target.value)}
              wrapperClassName="w-full"
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.smtpSecure}
              onChange={(e) => updateField("smtpSecure", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Use TLS
          </label>
        </>
      )}

      {value.emailProvider !== "PLATFORM_DEFAULT" && (
        <div className="border-t border-slate-100 pt-4">
          <label htmlFor="testEmail" className="mb-1 block text-sm font-medium text-slate-700">
            Send a test email
          </label>
          <div className="flex gap-2">
            <input
              id="testEmail"
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !testEmail}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
            >
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {testResult && (
            <p className={`mt-2 text-xs ${testResult.ok ? "text-green-700" : "text-red-700"}`}>
              {testResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
