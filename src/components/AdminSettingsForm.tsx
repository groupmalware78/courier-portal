"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PortalSettingsForm, type BrandingFields } from "./PortalSettingsForm";
import { WarehouseSettingsForm, type WarehouseFields } from "./WarehouseSettingsForm";
import { BankingSettingsForm, type BankingFields } from "./BankingSettingsForm";
import { ManifestScheduleForm, type ScheduleFields } from "./ManifestScheduleForm";
import { EmailProviderSettingsForm, type EmailProviderFields } from "./EmailProviderSettingsForm";
import { LegalContentForm, type LegalContentFields } from "./LegalContentForm";
import type { EmailProviderStatus } from "@/lib/apiTypes";

interface InitialSettings {
  companyName: string;
  logoEmoji: string;
  primaryColor: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  welcomeMessage: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  termsContent: string | null;
  privacyContent: string | null;
  warehouseName: string | null;
  warehouseAddressLine1: string | null;
  warehouseAddressLine2: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankBranch: string | null;
  manifestAutoGenerate: boolean;
  manifestTime: string | null;
  manifestDays: string[];
}

export function AdminSettingsForm({
  initial,
  initialEmailProvider,
}: {
  initial: InitialSettings;
  initialEmailProvider: EmailProviderStatus;
}) {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingFields>({
    companyName: initial.companyName,
    logoEmoji: initial.logoEmoji,
    primaryColor: initial.primaryColor,
    gradientFrom: initial.gradientFrom,
    gradientVia: initial.gradientVia,
    gradientTo: initial.gradientTo,
    welcomeMessage: initial.welcomeMessage ?? "",
    contactEmail: initial.contactEmail ?? "",
    contactPhone: initial.contactPhone ?? "",
  });
  const [warehouse, setWarehouse] = useState<WarehouseFields>({
    warehouseName: initial.warehouseName ?? "",
    warehouseAddressLine1: initial.warehouseAddressLine1 ?? "",
    warehouseAddressLine2: initial.warehouseAddressLine2 ?? "",
    warehouseCity: initial.warehouseCity ?? "",
    warehouseState: initial.warehouseState ?? "",
    warehouseZip: initial.warehouseZip ?? "",
    warehouseCountry: initial.warehouseCountry ?? "",
    warehousePhone: initial.warehousePhone ?? "",
  });
  const [banking, setBanking] = useState<BankingFields>({
    bankName: initial.bankName ?? "",
    bankAccountName: initial.bankAccountName ?? "",
    bankAccountNumber: initial.bankAccountNumber ?? "",
    bankRoutingNumber: initial.bankRoutingNumber ?? "",
    bankBranch: initial.bankBranch ?? "",
  });
  const [legal, setLegal] = useState<LegalContentFields>({
    termsContent: initial.termsContent ?? "",
    privacyContent: initial.privacyContent ?? "",
  });
  const [schedule, setSchedule] = useState<ScheduleFields>({
    manifestAutoGenerate: initial.manifestAutoGenerate,
    manifestTime: initial.manifestTime ?? "08:00",
    manifestDays: new Set(initial.manifestDays),
  });
  const [emailProvider, setEmailProvider] = useState<EmailProviderFields>({
    emailProvider: initialEmailProvider.emailProvider ?? "PLATFORM_DEFAULT",
    emailFromAddress: initialEmailProvider.emailFromAddress ?? "",
    resendApiKey: "",
    smtpHost: initialEmailProvider.smtpHost ?? "",
    smtpPort: initialEmailProvider.smtpPort ? String(initialEmailProvider.smtpPort) : "",
    smtpUsername: initialEmailProvider.smtpUsername ?? "",
    smtpSecure: initialEmailProvider.smtpSecure,
    smtpPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function withDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setSuccess(false);
      setter(v);
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const [brandingRes, warehouseRes, bankingRes, legalRes, scheduleRes, emailProviderRes] = await Promise.all([
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      }),
      fetch("/api/admin/warehouse", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warehouse),
      }),
      fetch("/api/admin/banking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(banking),
      }),
      fetch("/api/admin/legal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legal),
      }),
      fetch("/api/admin/manifest-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifestAutoGenerate: schedule.manifestAutoGenerate,
          manifestTime: schedule.manifestTime,
          manifestDays: Array.from(schedule.manifestDays),
        }),
      }),
      fetch("/api/admin/email-provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emailProvider,
          smtpPort: emailProvider.smtpPort ? Number(emailProvider.smtpPort) : undefined,
        }),
      }),
    ]);

    setSubmitting(false);

    for (const res of [brandingRes, warehouseRes, bankingRes, legalRes, scheduleRes, emailProviderRes]) {
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save settings.");
        return;
      }
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </div>
      )}

      <PortalSettingsForm
        value={branding}
        onChange={withDirty(setBranding)}
        heroImageUrl={initial.heroImageUrl}
        logoUrl={initial.logoUrl}
        faviconUrl={initial.faviconUrl}
      />
      <WarehouseSettingsForm value={warehouse} onChange={withDirty(setWarehouse)} />
      <BankingSettingsForm value={banking} onChange={withDirty(setBanking)} />
      <LegalContentForm value={legal} onChange={withDirty(setLegal)} />
      <ManifestScheduleForm value={schedule} onChange={withDirty(setSchedule)} />
      <EmailProviderSettingsForm
        value={emailProvider}
        onChange={withDirty(setEmailProvider)}
        hasSecretConfigured={initialEmailProvider.hasSecretConfigured}
      />

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
