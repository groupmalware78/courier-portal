// Manifest generation itself now lives entirely in admin
// (internal/manifests/generate) — this just keeps the snapshot shape
// available to the UI, which renders each manifest's captured package list.
export interface ManifestPackageSnapshot {
  trackingNumber: string;
  description: string | null;
  weightLbs: number | null;
  receivedAt: string;
  customerName: string | null;
}
