#!/bin/sh
# Runs the sound factory as several processes, each with its own lanes, writing one log per process to factory/logs/.
#   scripts/factory-lanes.sh <lanes-per-process> <kit-filter>...   e.g.  scripts/factory-lanes.sh 4 rainy wooden sci-fi
cd "$(dirname "$0")/.." || exit 1
mkdir -p factory/logs
lanes="${1:-4}"; shift
for kit in "$@"; do
  nohup node factory/factory-sound.mjs run "$lanes" "$kit" > "factory/logs/$kit.log" 2>&1 &
  echo "started $kit (pid $!)"
done
