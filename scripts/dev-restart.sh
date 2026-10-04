#!/bin/sh
# Restart the local dev server for real: the server finishes in-flight renders on SIGTERM, so a plain pkill can leave
# the old process holding the port while the new one exits. Kill whatever listens on the port, then start fresh.
PORT=${PORT:-5177}
PID=$(lsof -nP -tiTCP:$PORT -sTCP:LISTEN)
[ -n "$PID" ] && kill -9 $PID
sleep 1
PORT=$PORT nohup node server/local.js > /tmp/oasis-$PORT.log 2>&1 &
sleep 3
lsof -nP -iTCP:$PORT -sTCP:LISTEN | tail -1
