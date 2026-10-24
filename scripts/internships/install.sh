#!/usr/bin/env bash
# Install the pipeline's launchd agents. Re-run after any edit here, after
# `npm run resume` (it copies the PDFs), and after a new transcript.
#   poll  9:00 and 18:00: fetch the GitHub lists into the Sheet, enrich
#   Loops (launchd KeepAlive: each exits after a short pass, restarts 30-60 s later):
#   prepare  todo → ready / needs-answer / needs-human
#   draft    Claude answers what the bank cannot
#   apply-0..2  three workers, sharded by posting key: ready rows → applied / needs-human
#   mail     every 3 min: inbox → statuses, verification links, Applied tab
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
for f in "$repo"/out/companies/*.pdf; do v=company-$(basename "$f" .pdf); mkdir -p "$state/resumes/$v"; cp "$f" "$state/resumes/$v/William_Jin_Resume.pdf"; done
transcript=$(ls -t "$repo"/applications/_profile/transcript-*.pdf | head -1)
cp "$transcript" "$state/profile/William_Jin_Transcript.pdf"
# Facts for draft.mjs: the résumé as text and the work term record.
pdftotext -layout "$repo/out/resume-classic.pdf" "$state/profile/resume.txt"
cp "$(ls -t "$repo"/applications/_profile/work-term-record-*.txt | head -1)" "$state/profile/work-term-record.txt"
echo "files: $(ls "$state/resumes" | tr '\n' ' ')+ transcript $(basename "$transcript")"

nodedir=$(dirname "$(command -v node)")
# draft: its own loop, beside apply (Claude CLI, no browser).
printf '#!/usr/bin/env bash\ncd "%s" && exec node draft.mjs\n' "$dest" > "$dest/draft.sh"; chmod +x "$dest/draft.sh"

agent() { # label script log schedule-xml
  local plist=$HOME/Library/LaunchAgents/$1.plist
  cat > "$plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$dest/$2</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$nodedir:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
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
# Three apply workers, sharded by posting key (APPLY_SHARD), each with its own lock and browser profiles.
for k in 0 1 2; do
  printf '#!/usr/bin/env bash\ncd "%s" && APPLY_SHARD=%s/3 APPLY_PER_RUN=${APPLY_PER_RUN:-10} exec ./watchdog.sh "$HOME/Library/Logs/internships-apply-%s.log" node apply.mjs\n' "$dest" "$k" "$k" > "$dest/apply-$k.sh"; chmod +x "$dest/apply-$k.sh"
  agent dev.williamjin.internships-apply-$k apply-$k.sh internships-apply-$k '<key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>'
done
# prepare: its own loop (no browser for most rows).
printf '#!/usr/bin/env bash\ncd "%s" && exec node prepare.mjs\n' "$dest" > "$dest/prepare.sh"; chmod +x "$dest/prepare.sh"
agent dev.williamjin.internships-prepare prepare.sh internships-prepare '<key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>60</integer>'
# The single work job (2026-10-22) is replaced by the apply workers.
oldw=$HOME/Library/LaunchAgents/dev.williamjin.internships-work.plist
if [ -f "$oldw" ]; then launchctl bootout "gui/$(id -u)" "$oldw" 2>/dev/null || true; rm -f "$oldw"; fi
agent dev.williamjin.internships-draft draft.sh internships-draft '<key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>60</integer>'
# Mail poll: every 3 min, its own job so a long apply run does not delay it.
printf '#!/usr/bin/env bash\ncd "%s" && exec node mail.mjs\n' "$dest" > "$dest/mail.sh"; chmod +x "$dest/mail.sh"
agent dev.williamjin.internships-mail mail.sh internships-mail '<key>StartInterval</key><integer>180</integer>'

