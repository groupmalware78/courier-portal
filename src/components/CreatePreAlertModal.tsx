"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const PACKAGE_TYPE_OPTIONS = [
  { value: "BOX", label: "Box" },
  { value: "BAG", label: "Bag" },
  { value: "ENVELOPE", label: "Envelope" },
  { value: "OTHER", label: "Other" },
];

export function CreatePreAlertModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [pieces, setPieces] = useState("1");
  const [packageType, setPackageType] = useState("BOX");
  const [description, setDescription] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [cost, setCost] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setInvoiceFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!invoiceFile) {
      setError("Please upload the product invoice or receipt.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("trackingNumber", trackingNumber);
    formData.append("pieces", pieces);
    formData.append("packageType", packageType);
    formData.append("description", description);
    formData.append("weightLbs", weightLbs);
    if (cost) formData.append("cost", cost);
    formData.append("additionalDetails", additionalDetails);
    formData.append("merchantName", merchantName);
    formData.append("invoice", invoiceFile);

    const res = await fetch("/api/my-shipments/pre-alert", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to create pre-alert.");
      return;
    }

    router.refresh();
    onClose();
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Create Pre-Alert</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <h3 className="text-base font-semibold text-slate-900">Package Information</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <input
                required
                placeholder="Tracking Number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">tracking #</p>
            </div>
            <div>
              <input
                required
                type="number"
                min={1}
                placeholder="Pieces"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">Number of items</p>
            </div>
            <div>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className={inputClass}
              >
                {PACKAGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <input
                required
                placeholder="Package Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">e.g. phone, smart tv, etc</p>
            </div>
            <div>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Weight (lbs)"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  LBS
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Package weight</p>
            </div>
            <div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  USD
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Package cost</p>
            </div>
          </div>

          <h3 className="mt-6 text-base font-semibold text-slate-900">Additional Package Details</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <textarea
                rows={4}
                maxLength={100}
                placeholder="More Details"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-right text-xs text-slate-400">{additionalDetails.length} / 100</p>
            </div>
            <div>
              <input
                placeholder="Merchant/Seller Name"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">e.g. Amazon, Ebay</p>
            </div>
          </div>

          <h3 className="mt-6 text-base font-semibold text-slate-900">
            Product Invoice / Receipt (Click or Drag n Drop to Upload)
          </h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-3 flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-center transition ${
              dragActive ? "border-teal-400 bg-teal-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            {invoiceFile ? (
              <p className="px-4 text-sm font-medium text-slate-700">{invoiceFile.name}</p>
            ) : (
              <p className="px-4 text-sm font-medium text-slate-500">
                Click here or drag the invoice / receipt
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">PDF, JPEG, or PNG — up to 10MB. Required.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Pre-Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
