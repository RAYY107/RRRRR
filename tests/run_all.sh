#!/usr/bin/env bash
# Runs the offline Evora ID test suite (see README.md in this folder).
set -euo pipefail
cd "$(dirname "$0")"
python3 syntax.py
python3 test_shared.py
python3 test_server.py | tail -n 1
python3 test_client.py | tail -n 1
python3 export_data.py
node gallery.mjs
node ui.mjs
echo "screenshots: tests/out/*.png"
