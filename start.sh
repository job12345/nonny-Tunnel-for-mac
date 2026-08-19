#!/usr/bin/env bash
# ============================================================
#  Nonny Tunnel for Mac — Start
#  Reads credentials, builds profile, runs doctor, starts tunnel.
#  Developed by mr.j
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
  echo -e "${BOLD}Preflight checks…${NC}"
  echo ""

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
  info "tunnel-client: $CLIENT"

  # Profile template
  if [ ! -f "$PROFILE_TEMPLATE" ]; then
    fail "Profile template not found: $PROFILE_TEMPLATE"
  fi
  info "Profile template: $PROFILE_TEMPLATE"

  # Local config (Tunnel ID)
  if [ ! -f "$LOCAL_CONFIG" ]; then
    fail "Tunnel ID not configured. Run ./configure.sh or ./setup.sh first."
  fi
  info "Local config: $LOCAL_CONFIG"

  # MCP Server
  if ! command -v serena &>/dev/null; then
    fail "MCP Server is not installed or not in PATH. Install with: uv tool install -p 3.13 serena-agent"
  fi
  local mcp_ver
  mcp_ver=$(serena --version 2>&1 || echo "unknown")
  info "MCP Server: $(command -v serena) ($mcp_ver)"

  # API key in Keychain
  if ! security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w &>/dev/null; then
    fail "API key not found in Keychain. Run ./configure.sh or ./setup.sh first."
  fi
  info "API key: stored in macOS Keychain"

  echo ""
}

# ── Build Profile ────────────────────────────────────────────
build_profile() {
  echo -e "${BOLD}Building tunnel profile…${NC}"

  # Read Tunnel ID
  # shellcheck source=/dev/null
  source "$LOCAL_CONFIG"

  if [ -z "${TUNNEL_ID:-}" ]; then
    fail "TUNNEL_ID not set in $LOCAL_CONFIG"
  fi

  # Validate Tunnel ID format
  if ! echo "$TUNNEL_ID" | grep -qE '^tunnel_[0-9a-f]{32}$'; then
    fail "Invalid Tunnel ID format: $TUNNEL_ID (expected tunnel_ + 32 hex chars)"
  fi

  info "Tunnel ID: $TUNNEL_ID"

  # Create profile directory
  mkdir -p "$PROFILE_DIR"

  # Generate profile from template
  sed "s/__TUNNEL_ID__/$TUNNEL_ID/g" "$PROFILE_TEMPLATE" > "$PROFILE_PATH"

  info "Profile written: $PROFILE_PATH"
  echo ""
}

# ── Start Tunnel ─────────────────────────────────────────────
start_tunnel() {
  # Read API key from Keychain
  local api_key
  api_key=$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w)

  export CONTROL_PLANE_API_KEY="$api_key"

  # Run doctor first
  echo -e "${BOLD}Running tunnel-client doctor…${NC}"
  echo ""
  "$CLIENT" doctor --profile "$PROFILE_NAME" --explain 2>&1 || true
  echo ""

  # Start the daemon
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

# ── Main ─────────────────────────────────────────────────────
banner
preflight
build_profile
start_tunnel
