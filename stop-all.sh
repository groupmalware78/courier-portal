#!/usr/bin/env bash
# Stops everything run-all.sh starts: Service-Provider (admin — also
# covers warehouse package logging/editing, merged into this app), the
# three customer-portal instances, api, the mobile app's `flutter run`
# session, and any iOS Simulator / Android emulator that run-all.sh
# booted. Only touches processes actually bound to these ports /
# matching the flutter run command / running as the simulator or
# emulator itself — never a blind `kill` by name.

set -uo pipefail

PORTS=(3000 3001 3002 3003 3010)

is_next_process() {
  ps -p "$1" -o command= 2>/dev/null | grep -qE "next-server|next dev"
}

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti:"$port" -sTCP:LISTEN 2>/dev/null)
  killed_any=false
  for pid in $pids; do
    if is_next_process "$pid"; then
      # Kill this process and its parent wrapper (`node .../next dev -p
      # PORT`), since `lsof` sometimes reports only the next-server child.
      ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
      kill "$pid" 2>/dev/null
      if [ -n "$ppid" ] && is_next_process "$ppid"; then
        kill "$ppid" 2>/dev/null
      fi
      killed_any=true
    fi
  done
  if [ "$killed_any" = true ]; then
    echo "  [stop]  port $port"
  else
    echo "  [skip]  port $port — nothing running"
  fi
done

mobile_pid=$(pgrep -f "flutter_tools.snapshot run" 2>/dev/null | head -1)
if [ -n "$mobile_pid" ]; then
  kill "$mobile_pid" 2>/dev/null
  echo "  [stop]  mobile app (flutter run)"
else
  echo "  [skip]  mobile app — not running"
fi

# iOS Simulator: shut down whatever's booted (mirrors run-all.sh, which
# boots one if none is running).
if command -v xcrun >/dev/null 2>&1; then
  booted_ios=$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-F-]{36}')
  if [ -n "$booted_ios" ]; then
    xcrun simctl shutdown all >/dev/null 2>&1
    echo "  [stop]  iOS Simulator"
  else
    echo "  [skip]  iOS Simulator — not running"
  fi
else
  echo "  [skip]  iOS Simulator — xcrun not found"
fi

# Android emulator: kill the emulator process run-all.sh started (the
# `emulator` binary spawns a `qemu-system-*` child that outlives it, so
# match on that rather than the launcher).
android_pid=$(pgrep -f "qemu-system.*-avd" 2>/dev/null | head -1)
if [ -n "$android_pid" ]; then
  kill "$android_pid" 2>/dev/null
  echo "  [stop]  Android emulator"
else
  echo "  [skip]  Android emulator — not running"
fi

echo
echo "Done."
