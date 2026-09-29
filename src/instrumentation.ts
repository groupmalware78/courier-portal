export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startManifestScheduler } = await import("./lib/manifestScheduler");
    startManifestScheduler();
  }
}
