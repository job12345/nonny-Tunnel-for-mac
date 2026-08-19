#!/usr/bin/env bash
# ============================================================
#  Nonny Tunnel for Mac — Configure
#  Opens the Web UI to manage Tunnel ID and API Key.
#  Developed by mr.j
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                          ║${NC}"
echo -e "${CYAN}║   🔧 Nonny Tunnel for Mac — Configure    ║${NC}"
echo -e "${CYAN}║      by mr.j                             ║${NC}"
echo -e "${CYAN}║                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

cd "$ROOT/web-ui"

if [ ! -d "node_modules" ]; then
  echo "Installing Web UI dependencies…"
  npm install --silent
  echo ""
fi

echo -e "${CYAN}┌──────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                                              │${NC}"
echo -e "${CYAN}│   Configuration UI is running at:            │${NC}"
echo -e "${CYAN}│   ${BOLD}http://localhost:3847${NC}${CYAN}                      │${NC}"
echo -e "${CYAN}│                                              │${NC}"
echo -e "${CYAN}│   Update your Tunnel ID and API Key          │${NC}"
echo -e "${CYAN}│   Press Ctrl+C to close when done.           │${NC}"
echo -e "${CYAN}│                                              │${NC}"
echo -e "${CYAN}└──────────────────────────────────────────────┘${NC}"
echo ""

open "http://localhost:3847" 2>/dev/null || true

node server.js
