#!/usr/bin/env bash
set -e
echo "Starting Firebase emulator…"
firebase emulators:start --only firestore,auth --project test-project &
EMULATOR_PID=$!
sleep 5
echo "Running tests…"
node --test backend/tests/*.test.js || { kill $EMULATOR_PID; exit 1; }
kill $EMULATOR_PID