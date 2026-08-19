#!/usr/bin/env bash
# ============================================================
#  Nonny Tunnel for Mac — Setup
#  Downloads tunnel-client and launches the Web UI for config.
#  Developed by mr.j
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$ROOT/tunnel-client"
REPO_API="https://api.github.com/repos/openai/tunnel-client/releases"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║                                          ║${NC}"
  echo -e "${CYAN}║     🚀  Nonny Tunnel for Mac — Setup     ║${NC}"
  echo -e "${CYAN}║         by mr.j                          ║${NC}"
  echo -e "${CYAN}║                                          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""
}

fail() {
  echo -e "${RED}ERROR: $1${NC}" >&2
  exit 1
}

info() {
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# ── Prerequisites ────────────────────────────────────────────
check_prereqs() {
  echo -e "${BOLD}Checking prerequisites…${NC}"
  echo ""

  # curl
  if command -v curl &>/dev/null; then
    info "curl found: $(command -v curl)"
  else
    fail "curl is required but not found."
  fi

  # unzip
  if command -v unzip &>/dev/null; then
    info "unzip found"
  else
    fail "unzip is required."
  fi

  # uv
  if command -v uv &>/dev/null; then
    info "uv found: $(command -v uv)"
  else
    warn "uv not found. MCP Server requires uv."
    echo "  Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  fi

  # MCP Server
  if command -v serena &>/dev/null; then
    local mcp_ver
    mcp_ver=$(serena --version 2>&1 || true)
    info "MCP Server found: $(command -v serena) ($mcp_ver)"
  else
    warn "MCP Server not found in PATH."
    echo "  Install:"
    echo "    uv tool install -p 3.13 serena-agent"
    echo "    serena init"
  fi

  # Node.js
  if command -v node &>/dev/null; then
    info "Node.js found: $(node --version)"
  else
    fail "Node.js is required for the Setup Web UI. Install from https://nodejs.org or: brew install node"
  fi

  echo ""
}

# ── Detect Architecture ─────────────────────────────────────
detect_arch() {
  local arch
  arch=$(uname -m)
  case "$arch" in
    arm64|aarch64) echo "arm64" ;;
    x86_64|amd64)  echo "amd64" ;;
    *) fail "Unsupported architecture: $arch" ;;
  esac
}

# ── Download tunnel-client ───────────────────────────────────
download_tunnel_client() {
  local arch
  arch=$(detect_arch)

  if [ -f "$INSTALL_DIR/tunnel-client" ]; then
    info "tunnel-client is already installed at: $INSTALL_DIR/tunnel-client"
    return
  fi

  echo -e "${BOLD}Downloading tunnel-client for macOS ($arch)…${NC}"
  echo ""

  # Get release list
  local releases_json
  releases_json=$(curl -sL "$REPO_API")

  local download_url
  download_url=$(echo "$releases_json" | grep -o "\"browser_download_url\":\"[^\"]*darwin-${arch}\.zip\"" | head -1 | cut -d'"' -f4)

  if [ -z "$download_url" ]; then
    download_url="https://github.com/openai/tunnel-client/releases/download/v0.0.11/tunnel-client-v0.0.11-darwin-${arch}.zip"
  fi

  echo "  URL: $download_url"
  echo ""

  mkdir -p "$INSTALL_DIR"
  local tmp_archive="$INSTALL_DIR/tunnel-client.zip"
  curl -L --progress-bar -o "$tmp_archive" "$download_url"

  echo ""
  echo -e "${BOLD}Extracting…${NC}"
  unzip -q -o "$tmp_archive" -d "$INSTALL_DIR"
  rm -f "$tmp_archive"

  chmod +x "$INSTALL_DIR/tunnel-client" 2>/dev/null || true

  if [ -f "$INSTALL_DIR/tunnel-client" ]; then
    info "tunnel-client installed successfully!"
  else
    local found
    found=$(find "$INSTALL_DIR" -name "tunnel-client" -type f | head -1)
    if [ -n "$found" ]; then
      mv "$found" "$INSTALL_DIR/tunnel-client"
      chmod +x "$INSTALL_DIR/tunnel-client"
      info "tunnel-client installed successfully!"
    else
      fail "tunnel-client binary not found after extraction."
    fi
  fi

  echo ""
}

# ── Launch Web UI ────────────────────────────────────────────
launch_web_ui() {
  echo -e "${BOLD}Starting Nonny Tunnel Setup UI…${NC}"
  echo ""

  cd "$ROOT/web-ui"

  if [ ! -d "node_modules" ]; then
    echo "Installing Web UI dependencies…"
    npm install --silent
    echo ""
  fi

  echo -e "${CYAN}┌──────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}│   ⚡ Nonny Tunnel Dashboard is running at:   │${NC}"
  echo -e "${CYAN}│   ${BOLD}http://localhost:3847${NC}${CYAN}                      │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}│   Configure your Tunnel ID and API Key       │${NC}"
  echo -e "${CYAN}│   Press Ctrl+C to close when done.           │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}└──────────────────────────────────────────────┘${NC}"
  echo ""

  open "http://localhost:3847" 2>/dev/null || true
  node server.js
}

# ── Main ─────────────────────────────────────────────────────
banner
check_prereqs
download_tunnel_client
launch_web_ui
