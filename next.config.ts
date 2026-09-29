import type { NextConfig } from "next";
import os from "os";

// Detected at server-start time rather than hardcoded — a hardcoded LAN IP
// goes stale the moment this machine joins a different network (which is
// exactly what happened here: the old list pointed at IPs from a previous
// network and silently blocked every dev-resource request from this one,
// once someone actually loaded the app from that address — see
// "Blocked cross-origin request to Next.js dev resource" in the dev
// server log). Every non-internal IPv4 address is allowed, since dev-only
// protection doesn't need to be more precise than "this machine's LAN".
function lanDevOrigins(): string[] {
  const origins: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) origins.push(addr.address);
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: lanDevOrigins(),
};

export default nextConfig;
