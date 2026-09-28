#!/usr/bin/env bash
# Starts every app in this repo for local development: Service-Provider
# (admin — also covers warehouse package logging/editing, merged into
# this app), api, all three customer-portal instances, and the Flutter
# mobile app on whatever iOS/Android targets are available. Safe to
# re-run — anything already listening on its port (or an already-running
# `flutter run`) is left alone instead of being duplicated.
#
# No monorepo tooling — each app below has its own package.json,
# node_modules, and lock file, and needs its own `npm install` (and, for
# admin/api, `npm run db:generate`) on a fresh clone or after pulling
# package.json changes:
#   for d in admin api customer-portal customer-portal-bhf customer-portal-ids; do
#     (cd "$d" && npm install)
#   done
#
# Only admin and api connect to Postgres directly (each with its own
# Prisma schema against the same database — admin is the sole migration
# authority, api mirrors it, see the root README). The three
# customer-portal instances and the mobile app have no database of their
# own; they call api/'s REST endpoints instead (plain fetch(), no shared
# client library), so api/ needs to already be up and reachable at each
# instance's ADMIN_API_URL before the others are useful — though this
# script starts all of them regardless of order.
#
# Logs land in logs/<app>.log. Use ./stop-all.sh to tear everything down.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

mkdir -p logs

# name:dir:port
NEXT_APPS=(
  "admin:admin:3000"
  "customer-portal:customer-portal:3001"
  "customer-portal-bhf:customer-portal-bhf:3002"
  "customer-portal-ids:customer-portal-ids:3003"
  "api:api:3010"
)

port_listener_pid() {
  lsof -ti:"$1" -sTCP:LISTEN 2>/dev/null | head -1
}

# Best-effort LAN IP — lets other devices on the same network (a phone
# for mobile-app testing, a colleague's laptop) reach these dev servers
# instead of just localhost. macOS-only (this repo's only dev platform):
# tries the active Wi-Fi/Ethernet interfaces directly, then falls back to
# whatever interface has the default route.
lan_ip() {
  local ip iface
  for iface in en0 en1 en2; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
    [ -n "$ip" ] && { echo "$ip"; return; }
  done
  iface=$(route -n get 1.1.1.1 2>/dev/null | awk '/interface: /{print $2}')
  if [ -n "$iface" ]; then
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
    [ -n "$ip" ] && { echo "$ip"; return; }
  fi
  echo ""
}

LAN_IP=$(lan_ip)
if [ -n "$LAN_IP" ]; then
  echo "Local network IP: $LAN_IP"
else
  echo "Local network IP: could not be determined (no active en0/en1/en2 interface)"
fi
echo

start_next_app() {
  local name="$1" dir="$2" port="$3"
  local pid
  pid=$(port_listener_pid "$port")
  if [ -n "$pid" ]; then
    echo "  [skip]  $name — already running on :$port (pid $pid)"
    return
  fi

  if [ ! -d "$dir" ]; then
    echo "  [ERROR] $name — directory '$dir' not found"
    return
  fi

  (
    cd "$dir" || exit 1
    rm -rf .next node_modules/.cache
    nohup npm run dev >"../logs/$name.log" 2>&1 &
    disown
  )
  echo "  [start] $name — :$port → logs/$name.log"
}

echo "Next.js apps:"
for entry in "${NEXT_APPS[@]}"; do
  IFS=':' read -r name dir port <<<"$entry"
  start_next_app "$name" "$dir" "$port"
done

echo
echo "Mobile app (customer-portal-mobile):"

if ! command -v flutter >/dev/null 2>&1; then
  echo "  [ERROR] flutter not found on PATH — install Flutter to run the mobile app"
else
  if pgrep -f "flutter_tools.snapshot run" >/dev/null 2>&1; then
    echo "  [skip]  flutter run already active"
  else
    devices=()

    # iOS: boot a simulator if none is already booted.
    booted_ios=$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-F-]{36}' | head -1)
    if [ -z "$booted_ios" ]; then
      candidate=$(xcrun simctl list devices available 2>/dev/null | grep -i "iPhone" | head -1 | grep -oE '[0-9A-F-]{36}')
      if [ -n "$candidate" ]; then
        xcrun simctl boot "$candidate" >/dev/null 2>&1
        open -a Simulator
        booted_ios="$candidate"
        echo "  [boot]  no iOS Simulator was running — booted one"
      fi
    fi
    [ -n "$booted_ios" ] && devices+=("$booted_ios")

    # Android: boot an emulator if the SDK is set up but nothing is
    # running — mirrors the iOS logic above, using the SDK's own
    # `emulator` binary (same reasoning as using `xcrun simctl` directly
    # instead of `flutter emulators`, which needs its own separate source
    # setup and isn't the same signal `flutter doctor` uses).
    android_id=$(flutter devices 2>/dev/null | grep -i "android" | head -1 | sed -E 's/^[^•]*•[[:space:]]*([^[:space:]]+).*/\1/')
    if [ -z "$android_id" ] && command -v emulator >/dev/null 2>&1; then
      avd=$(emulator -list-avds 2>/dev/null | head -1)
      if [ -n "$avd" ]; then
        nohup emulator -avd "$avd" >/dev/null 2>&1 &
        disown
        echo "  [boot]  no Android emulator was running — booting $avd..."
        # Cold boot can take a while; poll briefly rather than blocking
        # indefinitely — if it's not ready yet, `flutter run` just won't
        # get an Android target this time (re-run once it finishes).
        for _ in $(seq 1 15); do
          sleep 3
          android_id=$(flutter devices 2>/dev/null | grep -i "android" | head -1 | sed -E 's/^[^•]*•[[:space:]]*([^[:space:]]+).*/\1/')
          [ -n "$android_id" ] && break
        done
        if [ -z "$android_id" ]; then
          echo "  [wait]  $avd is still booting — re-run this script once it's ready"
        fi
      fi
    fi
    if [ -n "$android_id" ]; then
      devices+=("$android_id")
    else
      [ -z "${avd:-}" ] && echo "  [skip]  no Android device/emulator available (see \`flutter doctor\`)"
    fi

    if [ "${#devices[@]}" -eq 0 ]; then
      echo "  [ERROR] no iOS or Android target available — open a simulator or connect a device, then re-run"
    else
      # The app refuses to run without an API key (see api_config.dart) —
      # every call, including login, throws before it ever reaches the
      # network, which just looks like "not connecting". This build only
      # targets Swift Cargo Express, so use customer-portal's own tenant
      # key: a rotated key lands in its data/runtime-config.json (see
      # apiKeyStore.ts), which takes precedence over .env the same way
      # apiClient.ts's createApiClient() prefers it.
      mobile_api_key=$(grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' customer-portal/data/runtime-config.json 2>/dev/null | sed -E 's/.*"([^"]*)"$/\1/')
      if [ -z "$mobile_api_key" ]; then
        mobile_api_key=$(grep -m1 '^TENANT_API_KEY=' customer-portal/.env 2>/dev/null | sed -E 's/^TENANT_API_KEY="?([^"]*)"?[[:space:]]*$/\1/')
      fi

      if [ -z "$mobile_api_key" ]; then
        echo "  [ERROR] no TENANT_API_KEY found (checked customer-portal/data/runtime-config.json and customer-portal/.env) — the app would fail to connect without one"
      else
        joined=$(IFS=,; echo "${devices[*]}")
        (
          cd customer-portal-mobile || exit 1
          nohup flutter run -d "$joined" --dart-define="API_KEY=$mobile_api_key" >"../logs/mobile.log" 2>&1 &
          disown
        )
        echo "  [start] flutter run -d $joined → logs/mobile.log"
      fi
    fi
  fi
fi

echo
if [ -n "$LAN_IP" ]; then
  echo "Reachable from other devices on this network:"
  for entry in "${NEXT_APPS[@]}"; do
    IFS=':' read -r name _ port <<<"$entry"
    echo "  $name — http://$LAN_IP:$port"
  done
  echo
fi
echo "Done. Tail a log with: tail -f logs/<app>.log"
