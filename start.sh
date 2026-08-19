#!/usr/bin/env bash
# ============================================================
#  Nonny Tunnel for Mac — Start
#  Reads credentials, builds profile, runs doctor, starts tunnel.
#  Developed by mr.j
#
#  Usage:
#    ./start.sh         # Normal start with preflight doctor checks
#    ./start.sh --fast   # Fast start (skips doctor, starts in <1s)
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT="$ROOT/tunnel-client/tunnel-client"
PROFILE_TEMPLATE="$ROOT/profiles/nonny-tunnel.yaml"
LOCAL_CONFIG="$ROOT/config/team.env"
PROFILE_NAME="nonny-tunnel"
PROFILE_DIR="$HOME/.config/tunnel-client"
PROFILE_PATH="$PROFILE_DIR/$PROFILE_NAME.yaml"

KEYCHAIN_ACCOUNT="nonny-tunnel"
KEYCHAIN_SERVICE="openai-runtime-api-key"

FAST_MODE=false
for arg in "$@"; do
  if [ "$arg" = "--fast" ] || [ "$arg" = "-f" ]; then
    FAST_MODE=true
  fi
done

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

fail() {
  echo ""
  echo -e "${RED}ERROR: $1${NC}" >&2
  echo ""
  exit 1
}

info() {
  echo -e "${GREEN}✓${NC} $1"
}

banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║                                          ║${NC}"
  echo -e "${CYAN}║     ▶  Nonny Tunnel for Mac — Start      ║${NC}"
  echo -e "${CYAN}║        by mr.j                           ║${NC}"
  echo -e "${CYAN}║                                          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Preflight Checks ────────────────────────────────────────
preflight() {
  # tunnel-client binary
  if [ ! -f "$CLIENT" ]; then
    local found
    found=$(find "$ROOT/tunnel-client" -name "tunnel-client" -type f 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      CLIENT="$found"
    else
      fail "tunnel-client is not installed. Run ./setup.sh first."
    fi
  fi

  # Profile template
  if [ ! -f "$PROFILE_TEMPLATE" ]; then
    fail "Profile template not found: $PROFILE_TEMPLATE"
  fi

  # Local config (Tunnel ID)
  if [ ! -f "$LOCAL_CONFIG" ]; then
    fail "Tunnel ID not configured. Run ./configure.sh or ./setup.sh first."
  fi

  # MCP Server
  if ! command -v serena &>/dev/null; then
    fail "MCP Server is not installed or not in PATH. Install with: uv tool install -p 3.13 serena-agent"
  fi

  # API key in Keychain
  if ! security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w &>/dev/null; then
    fail "API key not found in Keychain. Run ./configure.sh or ./setup.sh first."
  fi

  if [ "$FAST_MODE" = false ]; then
    echo -e "${BOLD}Preflight checks passed:${NC}"
    info "tunnel-client: $CLIENT"
    info "Local config: $LOCAL_CONFIG"
    info "MCP Server: $(command -v serena)"
    info "API key: Secured in macOS Keychain"
    echo ""
  fi
}

# ── Build Profile ────────────────────────────────────────────
build_profile() {
  # Read Tunnel ID
  # shellcheck source=/dev/null
  source "$LOCAL_CONFIG"

  if [ -z "${TUNNEL_ID:-}" ]; then
    fail "TUNNEL_ID not set in $LOCAL_CONFIG"
  fi

  if ! echo "$TUNNEL_ID" | grep -qE '^tunnel_[0-9a-f]{32}$'; then
    fail "Invalid Tunnel ID format: $TUNNEL_ID (expected tunnel_ + 32 hex chars)"
  fi

  mkdir -p "$PROFILE_DIR"
  sed "s/__TUNNEL_ID__/$TUNNEL_ID/g" "$PROFILE_TEMPLATE" > "$PROFILE_PATH"
}

# ── Start Tunnel ─────────────────────────────────────────────
start_tunnel() {
  local api_key
  api_key=$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w)
  export CONTROL_PLANE_API_KEY="$api_key"

  if [ "$FAST_MODE" = false ]; then
    echo -e "${BOLD}Running tunnel preflight doctor…${NC}"
    "$CLIENT" doctor --profile "$PROFILE_NAME" --explain 2>&1 || true
    echo ""
  fi

  echo -e "${CYAN}┌──────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}│   🟢 Nonny Tunnel is starting…               │${NC}"
  echo -e "${CYAN}│   Status UI: ${BOLD}http://127.0.0.1:18010/ui${NC}${CYAN}      │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}│   Keep this window open while using ChatGPT. │${NC}"
  echo -e "${CYAN}│   Press Ctrl+C to stop the tunnel.           │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}└──────────────────────────────────────────────┘${NC}"
  echo ""

  "$CLIENT" start --profile "$PROFILE_NAME"
}

banner
preflight
build_profile
start_tunnel
