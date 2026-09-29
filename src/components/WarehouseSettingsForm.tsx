"use client";

import { formatPhoneInput } from "@/lib/phoneFormat";

export interface WarehouseFields {
  warehouseName: string;
  warehouseAddressLine1: string;
  warehouseAddressLine2: string;
  warehouseCity: string;
  warehouseState: string;
  warehouseZip: string;
  warehouseCountry: string;
  warehousePhone: string;
}

export function WarehouseSettingsForm({
  value,
  onChange,
}: {
  value: WarehouseFields;
  onChange: (value: WarehouseFields) => void;
}) {
  function updateField(field: keyof WarehouseFields, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Warehouse shipping address</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Shown to customers on their profile once set — the address they ship purchases to.
        </p>
      </div>

      <div>
        <label htmlFor="warehouseName" className="mb-1 block text-sm font-medium text-slate-700">
          Warehouse name
        </label>
        <input
          id="warehouseName"
          placeholder="e.g. Miami Warehouse"
          value={value.warehouseName}
          onChange={(e) => updateField("warehouseName", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="warehouseAddressLine1" className="mb-1 block text-sm font-medium text-slate-700">
          Address line 1
        </label>
        <input
          id="warehouseAddressLine1"
          value={value.warehouseAddressLine1}
          onChange={(e) => updateField("warehouseAddressLine1", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="warehouseAddressLine2" className="mb-1 block text-sm font-medium text-slate-700">
          Address line 2
        </label>
        <input
          id="warehouseAddressLine2"
          placeholder="Suite / unit number"
          value={value.warehouseAddressLine2}
          onChange={(e) => updateField("warehouseAddressLine2", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="warehouseCity" className="mb-1 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            id="warehouseCity"
            value={value.warehouseCity}
            onChange={(e) => updateField("warehouseCity", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="warehouseState" className="mb-1 block text-sm font-medium text-slate-700">
            State
          </label>
          <input
            id="warehouseState"
            value={value.warehouseState}
            onChange={(e) => updateField("warehouseState", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="warehouseZip" className="mb-1 block text-sm font-medium text-slate-700">
            ZIP / postal code
          </label>
          <input
            id="warehouseZip"
            value={value.warehouseZip}
            onChange={(e) => updateField("warehouseZip", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="warehouseCountry" className="mb-1 block text-sm font-medium text-slate-700">
            Country
          </label>
          <input
            id="warehouseCountry"
            value={value.warehouseCountry}
            onChange={(e) => updateField("warehouseCountry", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="warehousePhone" className="mb-1 block text-sm font-medium text-slate-700">
          Phone
        </label>
        <input
          id="warehousePhone"
          type="tel"
          pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
          placeholder="+1 (000) 000-0000"
          value={value.warehousePhone}
          onChange={(e) => updateField("warehousePhone", formatPhoneInput(e.target.value))}
          className={inputClass}
        />
      </div>
    </div>
  );
}
