import { apiClient } from "./apiClient";
import { getPortalSettings } from "./settings";
import { getTenantCompanyIdOrNull } from "./tenant";

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CHECK_INTERVAL_MS = 30_000;

// Guards against firing twice inside the same minute (the check runs
// every 30s) and against a fresh interval starting more than once — Next
// dev can re-run instrumentation's register() across hot reloads.
let lastFiredMinuteKey: string | null = null;

async function tick() {
  try {
    // Only ever this deployment's own company: other portal_settings rows
    // in this shared table belong to other deployments' own scheduler
    // processes, and firing on their behalf here would double-generate
    // their manifests.
    const companyId = await getTenantCompanyIdOrNull();
    if (!companyId) return;

    const settings = await getPortalSettings();
    if (!settings.manifestAutoGenerate || !settings.manifestTime) return;

    const now = new Date();
    if (!settings.manifestDays.includes(DAY_CODES[now.getDay()])) return;

    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    if (currentTime !== settings.manifestTime) return;

    const minuteKey = `${now.toDateString()} ${currentTime}`;
    if (lastFiredMinuteKey === minuteKey) return;
    lastFiredMinuteKey = minuteKey;

    const { manifest } = await apiClient.manifests.generate("SCHEDULE");
    console.log(
      `[manifest] auto-generated ${manifest.id} with ${manifest.packageCount} package(s) at ${now.toISOString()}`
    );
  } catch (err) {
    console.error("[manifest] scheduler tick failed:", err);
  }
}

const globalForScheduler = globalThis as unknown as {
  manifestSchedulerStarted?: boolean;
};

export function startManifestScheduler() {
  if (globalForScheduler.manifestSchedulerStarted) return;
  globalForScheduler.manifestSchedulerStarted = true;
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log("[manifest] scheduler started, checking every 30s");
}
