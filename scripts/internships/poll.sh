#!/usr/bin/env bash
# Pull the three 2027 internship repos, parse + filter their tables, append
# anything new to the "Internship backlog 2027" Sheet (Backlog + New postings).
# Runs anywhere with node + python3 + the Wren service-account key.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); work=${WORK:-$(mktemp -d)}; mkdir -p "$work/repos"
for r in zapplyjobs/Internships-2027 speedyapply/2027-SWE-College-Jobs negarprh/Canadian-Tech-Internships-2027; do
  n=$(echo "$r" | tr / _); curl -fsSL "https://raw.githubusercontent.com/$r/main/README.md" -o "$work/repos/$n.md"
done
curl -fsSL https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/INTERN_INTL.md -o "$work/repos/speedyapply_INTERN_INTL.md"
REPOS="$work/repos" OUT="$work/backlog.csv" python3 -I "$here/parse.py" >/dev/null
node "$here/push.mjs" "$work/backlog.csv"
# Re-read needs-answer forms once per poll: bank or draft changes free rows.
node "$here/prepare.mjs" --recheck
