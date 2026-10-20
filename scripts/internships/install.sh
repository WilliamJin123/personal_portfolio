#!/usr/bin/env bash
# Install two launchd agents: poll (9:00 and 18:00 local) and prepare (hourly).
# A fire missed while asleep runs on wake. macOS TCC blocks launchd from
# ~/Documents, so the scripts are copied to ~/.local/share/internships-poll.
# Re-run after edits.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); dest=$HOME/.local/share/internships-poll; mkdir -p "$dest" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp "$here"/poll.sh "$here"/parse.py "$here"/push.mjs "$here"/sa-token.mjs "$here"/sheet.mjs "$here"/enrich.mjs "$here"/prepare.mjs "$dest/"
nodedir=$(dirname "$(command -v node)")
label=dev.williamjin.internships-poll; plist=$HOME/Library/LaunchAgents/$label.plist
cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$dest/poll.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$nodedir:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><array>
    <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/internships-poll.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/internships-poll.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "installed $label; run now: launchctl kickstart -k gui/$(id -u)/$label; log: ~/Library/Logs/internships-poll.log"

# prepare needs playwright next to it (importing autobrowse's copy from
# ~/Documents is blocked under launchd too). Browsers are shared in
# ~/Library/Caches/ms-playwright. State (form dumps, later screenshots) lives in
# ~/.local/share/internships, linked from the repo as applications/_runtime.
state=$HOME/.local/share/internships; mkdir -p "$state"
ln -sfn "$state" "$here/../../applications/_runtime"
[ -d "$dest/node_modules/playwright" ] || (cd "$dest" && npm init -y >/dev/null && npm i --silent playwright@1.63.0)
label=dev.williamjin.internships-prepare; plist=$HOME/Library/LaunchAgents/$label.plist
printf '#!/usr/bin/env bash\ncd "%s" && exec node prepare.mjs\n' "$dest" > "$dest/prepare.sh"; chmod +x "$dest/prepare.sh"
cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$dest/prepare.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$nodedir:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/internships-prepare.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/internships-prepare.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "installed $label (hourly); run now: launchctl kickstart -k gui/$(id -u)/$label; log: ~/Library/Logs/internships-prepare.log"
