#!/usr/bin/env bash
# watchdog.sh LOG CMD...: runs CMD; stops it and its browser when LOG goes 25 min without a write.
# A hung page can block node's event loop, so no timer inside node fires (2026-10-23: a worker stuck 7 h).
log=$1; shift
"$@" & pid=$!; start=$(date +%s)
# TERM first: Chrome then exits cleanly and deletes its code-sign clone (a KILL leaks about 40 MB each). KILL only what is left after 10 s.
stop() { pkill -TERM -P "$pid"; kill -TERM "$pid" 2>/dev/null; for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 1; done; pkill -9 -P "$pid"; kill -9 "$pid" 2>/dev/null; }
trap 'stop' TERM INT
while kill -0 "$pid" 2>/dev/null; do
  sleep 60
  # From the last write or the start, whichever is later: an idle log is not a hung run.
  m=$(stat -f %m "$log" 2>/dev/null || echo 0); [ "$m" -lt "$start" ] && m=$start
  age=$(( $(date +%s) - m ))
  if [ "$age" -gt 1500 ]; then echo "watchdog: no output for ${age}s, stopping pid $pid" >> "$log"; stop; fi
done
wait "$pid"
