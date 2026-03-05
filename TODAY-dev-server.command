#!/bin/bash

# ── TODAY — Local Dev Server ──────────────────────────────────────────────────
# Double-click this file to start your local server.
# Your app will open automatically at http://localhost:3000
# Press Ctrl+C in this window to stop the server.
# ─────────────────────────────────────────────────────────────────────────────

# Change to the folder where this script lives (your repo root)
cd "$(dirname "$0")"

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │   TODAY — Local Dev Server      │"
echo "  │   http://localhost:3000         │"
echo "  │   Press Ctrl+C to stop          │"
echo "  └─────────────────────────────────┘"
echo ""

# Open browser after a short delay to let the server start
sleep 1.5 && open "http://localhost:3000" &

# Start the server
npx serve . --listen 3000
