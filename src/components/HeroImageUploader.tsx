"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function HeroImageUploader({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/settings/hero-image", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to upload image.");
      return;
    }

    setUrl(data.heroImageUrl);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);

    const res = await fetch("/api/admin/settings/hero-image", { method: "DELETE" });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to remove image.");
      return;
    }

    setUrl(null);
    router.refresh();
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Homepage hero background image
      </label>
      <p className="mb-2 text-xs text-slate-400">
        JPEG, PNG, WebP, or GIF, up to 5MB. Leave empty to use the default gradient.
      </p>

      {error && (
        <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {url && (
        <div
          className="mb-3 h-32 w-full rounded-lg border border-slate-200 bg-cover bg-center"
          style={{ backgroundImage: `url(${url})` }}
        />
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {uploading && <p className="mt-1 text-xs text-slate-400">Saving…</p>}
    </div>
  );
}
