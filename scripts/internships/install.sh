#!/usr/bin/env bash
# Install the pipeline's launchd agents. Re-run after any edit here, after
# `npm run resume` (it copies the PDFs), and after a new transcript.
#   poll  9:00 and 18:00: fetch the GitHub lists into the Sheet, enrich
#   work  hourly: prepare (todo → ready / needs-answer / needs-human), then
#         apply (ready tier B and go rows → applied / needs-human)
# A fire missed while asleep runs on wake. macOS TCC blocks launchd from
# ~/Documents, so code goes to ~/.local/share/internships-poll and state
# (PDFs, form dumps, screenshots, browser profile) to ~/.local/share/internships,
# linked from the repo as applications/_runtime.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../.." && pwd)
dest=$HOME/.local/share/internships-poll; state=$HOME/.local/share/internships
mkdir -p "$dest/flows" "$state/resumes" "$state/profile" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
ln -sfn "$state" "$repo/applications/_runtime"

# Code, and its pinned deps (@wrenautomation/autobrowse from npm, playwright).
cp "$here"/*.mjs "$here"/*.sh "$here"/parse.py "$here"/package.json "$dest/"
cp "$here"/flows/*.mjs "$dest/flows/"
(cd "$dest" && npm install --silent --no-audit --no-fund)

# Files the apply flows upload, named as a recruiter should see them.
rm -rf "$state/resumes"/*
mkdir -p "$state/resumes/classic" && cp "$repo/out/resume-classic.pdf" "$state/resumes/classic/William_Jin_Resume.pdf"
for f in "$repo"/out/variants/*.pdf; do v=$(basename "$f" .pdf); mkdir -p "$state/resumes/$v"; cp "$f" "$state/resumes/$v/William_Jin_Resume.pdf"; done
transcript=$(ls -t "$repo"/applications/_profile/transcript-*.pdf | head -1)
cp "$transcript" "$state/profile/William_Jin_Transcript.pdf"
echo "files: $(ls "$state/resumes" | tr '\n' ' ')+ transcript $(basename "$transcript")"

nodedir=$(dirname "$(command -v node)")
printf '#!/usr/bin/env bash\ncd "%s" && node prepare.mjs; exec node apply.mjs\n' "$dest" > "$dest/work.sh"; chmod +x "$dest/work.sh"

agent() { # label script log schedule-xml
  local plist=$HOME/Library/LaunchAgents/$1.plist
  cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$dest/$2</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$nodedir:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  $4
  <key>StandardOutPath</key><string>$HOME/Library/Logs/$3.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/$3.log</string>
</dict></plist>
PL
  launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$plist"
  echo "installed $1; run now: launchctl kickstart -k gui/$(id -u)/$1; log: ~/Library/Logs/$3.log"
}

agent dev.williamjin.internships-poll poll.sh internships-poll '<key>StartCalendarInterval</key><array><dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict><dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict></array>'
agent dev.williamjin.internships-work work.sh internships-work '<key>StartInterval</key><integer>3600</integer>'

# The old prepare-only agent (2026-10-19) is replaced by work.
old=$HOME/Library/LaunchAgents/dev.williamjin.internships-prepare.plist
if [ -f "$old" ]; then launchctl bootout "gui/$(id -u)" "$old" 2>/dev/null || true; rm -f "$old"; echo "removed dev.williamjin.internships-prepare"; fi
