"use client";

export interface BankingFields {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankBranch: string;
}

export function BankingSettingsForm({
  value,
  onChange,
}: {
  value: BankingFields;
  onChange: (value: BankingFields) => void;
}) {
  function updateField(field: keyof BankingFields, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Banking information</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Printed on the PDF invoice generated when a package is marked ready for pickup.
        </p>
      </div>

      <div>
        <label htmlFor="bankName" className="mb-1 block text-sm font-medium text-slate-700">
          Bank name
        </label>
        <input
          id="bankName"
          placeholder="e.g. National Commercial Bank"
          value={value.bankName}
          onChange={(e) => updateField("bankName", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="bankAccountName" className="mb-1 block text-sm font-medium text-slate-700">
          Account name
        </label>
        <input
          id="bankAccountName"
          value={value.bankAccountName}
          onChange={(e) => updateField("bankAccountName", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bankAccountNumber" className="mb-1 block text-sm font-medium text-slate-700">
            Account number
          </label>
          <input
            id="bankAccountNumber"
            value={value.bankAccountNumber}
            onChange={(e) => updateField("bankAccountNumber", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bankRoutingNumber" className="mb-1 block text-sm font-medium text-slate-700">
            Routing number
          </label>
          <input
            id="bankRoutingNumber"
            value={value.bankRoutingNumber}
            onChange={(e) => updateField("bankRoutingNumber", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bankBranch" className="mb-1 block text-sm font-medium text-slate-700">
          Branch
        </label>
        <input
          id="bankBranch"
          value={value.bankBranch}
          onChange={(e) => updateField("bankBranch", e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}
