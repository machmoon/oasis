#!/bin/sh
# Commits the factory's output every ten minutes while it runs: new sound programs, stats and lessons.
cd "$(dirname "$0")/.." || exit 1
while true; do
  sleep 600
  n=$(ls sounds | wc -l | tr -d ' ')
  git add sounds factory/stats.jsonl factory/lessons-sound.md factory/rejected-sound 2>/dev/null
  if ! git diff --cached --quiet; then
    git commit -q -m "Factory: $n sound programs published so far

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
    echo "$(date) committed at $n sounds"
  fi
done
