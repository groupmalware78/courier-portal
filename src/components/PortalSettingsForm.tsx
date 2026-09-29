"use client";

import { HeroImageUploader } from "./HeroImageUploader";
import { BrandImageUploader } from "./BrandImageUploader";
import { formatPhoneInput } from "@/lib/phoneFormat";

export interface BrandingFields {
  companyName: string;
  logoEmoji: string;
  primaryColor: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  welcomeMessage: string;
  contactEmail: string;
  contactPhone: string;
}

export function PortalSettingsForm({
  value,
  onChange,
  heroImageUrl,
  logoUrl,
  faviconUrl,
}: {
  value: BrandingFields;
  onChange: (value: BrandingFields) => void;
  heroImageUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}) {
  function updateField(field: keyof BrandingFields, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Branding</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-slate-700">
            Company name
          </label>
          <input
            id="companyName"
            required
            value={value.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="logoEmoji" className="mb-1 block text-sm font-medium text-slate-700">
            Logo emoji
          </label>
          <input
            id="logoEmoji"
            required
            value={value.logoEmoji}
            onChange={(e) => updateField("logoEmoji", e.target.value)}
            className={`${inputClass} text-lg`}
            maxLength={4}
          />
          <p className="mt-1 text-xs text-slate-400">Used wherever a logo image hasn&apos;t been uploaded.</p>
        </div>
      </div>

      <div>
        <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-slate-700">
          Primary color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Primary color picker"
            value={value.primaryColor}
            onChange={(e) => updateField("primaryColor", e.target.value)}
            className="h-9 w-12 rounded border border-slate-300"
          />
          <input
            id="primaryColor"
            required
            value={value.primaryColor}
            onChange={(e) => updateField("primaryColor", e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Site background gradient
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Shown at full strength behind the homepage hero (when no background image is uploaded
          below), and as a subtle background wash across the rest of the site — sign-in, sign-up,
          and the whole portal.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["gradientFrom", "From"],
              ["gradientVia", "Via"],
              ["gradientTo", "To"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <span className="mb-1 block text-xs text-slate-500">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`Gradient ${label.toLowerCase()} color picker`}
                  value={value[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="h-9 w-9 shrink-0 rounded border border-slate-300"
                />
                <input
                  value={value[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className={`${inputClass} font-mono text-xs`}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-3 h-10 rounded-md"
          style={{
            background: `linear-gradient(to bottom right, ${value.gradientFrom}, ${value.gradientVia}, ${value.gradientTo})`,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandImageUploader
          initialUrl={logoUrl}
          label="Logo"
          hint="JPEG, PNG, WebP, or SVG, up to 5MB. Shown instead of the emoji in headers and the contact page."
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          endpoint="/api/admin/settings/logo"
          responseKey="logoUrl"
        />
        <BrandImageUploader
          initialUrl={faviconUrl}
          label="Favicon"
          hint="PNG, ICO, or SVG, up to 1MB. Shown as the browser tab icon."
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
          endpoint="/api/admin/settings/favicon"
          responseKey="faviconUrl"
          previewSizeClass="h-10 w-10"
        />
      </div>

      <HeroImageUploader initialUrl={heroImageUrl} />

      <div>
        <label htmlFor="welcomeMessage" className="mb-1 block text-sm font-medium text-slate-700">
          Welcome message
        </label>
        <textarea
          id="welcomeMessage"
          value={value.welcomeMessage}
          onChange={(e) => updateField("welcomeMessage", e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Shown on the public tracking page"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
            Contact email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={value.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-slate-700">
            Contact phone
          </label>
          <input
            id="contactPhone"
            type="tel"
            pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
            placeholder="+1 (000) 000-0000"
            value={value.contactPhone}
            onChange={(e) => updateField("contactPhone", formatPhoneInput(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
