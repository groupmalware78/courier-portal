"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

export function BarcodeCameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled) return;
        if (result) {
          onDetected(result.getText());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not access the camera for scanning."
          );
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-900 p-2">
      {error ? (
        <div className="p-3 text-sm text-red-300">{error}</div>
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full rounded-md object-cover"
          muted
          playsInline
        />
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
      >
        Close camera
      </button>
    </div>
  );
}
