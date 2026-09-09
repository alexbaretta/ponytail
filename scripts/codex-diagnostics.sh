#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(dirname $(readlink -f "${0}"))
TMP_DIR=$(mkdir -p ${SCRIPT_DIR}/../tmp && readlink -f ${SCRIPT_DIR}/../tmp)
APP="/Applications/ChatGPT.app/Contents/Resources/codex"
OUT="${TMP_DIR}/codex-diagnostics-$(id -un)-$(date +%Y%m%d-%H%M%S).txt"
exec > >(tee "$OUT") 2>&1

echo "=== ChatGPT/Codex Per-User Diagnostic ==="
echo "timestamp: $(date -Iseconds 2>/dev/null || date)"
echo "user: $(id -un)"
echo "uid: $(id -u)"
echo "home: $HOME"
echo "host: $(hostname)"
echo

echo "=== OS / APP ==="
sw_vers 2>/dev/null || true
echo
if [ -x "$APP" ]; then
  "$APP" --version 2>/dev/null || true
else
  echo "Codex CLI not found at: $APP"
fi
defaults read /Applications/ChatGPT.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null || true
defaults read /Applications/ChatGPT.app/Contents/Info.plist CFBundleVersion 2>/dev/null || true
echo

echo "=== CODEX FEATURES ==="
if [ -x "$APP" ]; then
  "$APP" features list 2>&1 || true
fi
echo

echo "=== CODEX DOCTOR ==="
if [ -x "$APP" ]; then
  "$APP" doctor 2>&1 || true
fi
echo

echo "=== CONFIG.TOML (auth excluded by design) ==="
if [ -f "$HOME/.codex/config.toml" ]; then
  cat "$HOME/.codex/config.toml"
else
  echo "NO ~/.codex/config.toml"
fi
echo

echo "=== PLUGIN LIST ==="
if [ -x "$APP" ]; then
  "$APP" plugin list --json 2>&1 || true
fi
echo

echo "=== CHATGPT DEFAULTS: com.openai.codex ==="
defaults read com.openai.codex 2>&1 || true
echo

echo "=== RELEVANT USER PATHS ==="
find "$HOME/Library/Preferences" "$HOME/Library/Application Support" "$HOME/.codex" \
  -maxdepth 3 \
  \( -iname '*openai*' -o -iname '*chatgpt*' -o -iname '*codex*' -o -iname '*computer*use*' -o -iname '*browser*' \) \
  -print 2>/dev/null | sort || true
echo

echo "=== CODEX SMALL STATE FILES ==="
find "$HOME/.codex" -maxdepth 3 -type f \
  \( -name '*.toml' -o -name '*.plist' -o -name '*.json' \) \
  ! -name 'auth.json' \
  ! -path '*/sessions/*' \
  ! -path '*/rollouts/*' \
  ! -path '*/logs/*' \
  -size -256k \
  -print 2>/dev/null | sort || true
echo

echo "=== BROWSER PLUGIN HASHES ==="
BROWSER_DIR="$HOME/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/browser"
if [ -d "$BROWSER_DIR" ]; then
  find "$BROWSER_DIR" -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 shasum -a 256 2>/dev/null
else
  echo "Browser plugin staging dir not found: $BROWSER_DIR"
fi
echo

echo "=== COMPUTER-USE PLUGIN HASHES ==="
CU_PLUGIN_DIR="$HOME/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/computer-use"
if [ -d "$CU_PLUGIN_DIR" ]; then
  find "$CU_PLUGIN_DIR" -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 shasum -a 256 2>/dev/null
else
  echo "Computer-use plugin staging dir not found: $CU_PLUGIN_DIR"
fi
echo

echo "=== COMPUTER USE APP INFO ==="
CUA="$HOME/.codex/computer-use/Codex Computer Use.app"
if [ -d "$CUA" ]; then
  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$CUA/Contents/Info.plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$CUA/Contents/Info.plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$CUA/Contents/Info.plist" 2>/dev/null || true
  shasum -a 256 "$CUA/Contents/MacOS/SkyComputerUseService" 2>/dev/null || true
  codesign -dv --verbose=4 "$CUA" 2>&1 | egrep 'Identifier=|TeamIdentifier=|Timestamp=|CDHash=' || true
else
  echo "No installed computer-use app at: $CUA"
fi
echo

echo "=== TCC / PERMISSIONS (READ-ONLY, USER DB) ==="
TCC_DB="$HOME/Library/Application Support/com.apple.TCC/TCC.db"
if [ -r "$TCC_DB" ]; then
  sqlite3 "$TCC_DB" \
    "SELECT service,client,auth_value,auth_reason,last_modified
     FROM access
     WHERE client LIKE '%openai%' OR client LIKE '%codex%' OR client LIKE '%ChatGPT%'
     ORDER BY service,client;" 2>/dev/null || echo "Unable to query user TCC DB"
else
  echo "User TCC DB not readable directly (normal on some macOS configurations)"
fi
echo

echo "=== RUNNING CHATGPT/CODEX/CUA PROCESSES ==="
ps -axo pid,ppid,command | egrep -i 'ChatGPT|Codex|SkyComputerUse|CUAService|computer-use' | grep -v egrep || true
echo

echo "=== NETWORK LISTENERS/CONNECTIONS FOR CHATGPT/CUA ==="
for pid in $(pgrep -f '/Applications/ChatGPT.app|SkyComputerUseService' 2>/dev/null | sort -u); do
  echo "--- PID $pid ---"
  lsof -nP -a -p "$pid" -i 2>/dev/null || true
done
echo

echo "=== local servers ==="
cat "$HOME/Library/Application Support/Codex/browser-sidebar-local-servers.json" 2>&1

echo
echo "=== browser app paths ==="
find "$HOME/Library/Application Support/Codex" \
  -maxdepth 3 \
  \( -path '*codex-browser-app*' -o -name 'browser-sidebar-*.json' \) \
  -print

echo
echo "=== browser app metadata ==="
find "$HOME/Library/Application Support/Codex" \
  -maxdepth 4 \
  \( -path '*codex-browser-app*' -o -name 'browser-sidebar-*.json' \) \
  -type f \
  -exec stat -f '%Sp %Su:%Sg %z %Sm %N' -t '%Y-%m-%d %H:%M:%S' {} \; 2>/dev/null

echo "=== DONE ==="
echo "output_file: $OUT"
echo
echo "NOTE: auth.json, rollout/session contents, and large logs were intentionally excluded."
