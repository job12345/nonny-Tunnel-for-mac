#!/usr/bin/env bash
# ============================================================
#  Nonny Tunnel for Mac — Setup
#  Downloads tunnel-client and launches the Web UI for config.
#  Developed by mr.j
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$ROOT/tunnel-client"
REPO_API="https://api.github.com/repos/openai/tunnel-client/releases/latest"

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

  # jq (optional but recommended)
  if command -v jq &>/dev/null; then
    info "jq found: $(command -v jq)"
  else
    warn "jq not found. Install with: brew install jq"
    warn "Continuing without jq (will use grep fallback)…"
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

  # node (for Web UI)
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

  echo -e "${BOLD}Downloading tunnel-client for macOS ($arch)…${NC}"
  echo ""

  # Get latest release info
  local release_json
  release_json=$(curl -sL "$REPO_API")

  local tag_name
  if command -v jq &>/dev/null; then
    tag_name=$(echo "$release_json" | jq -r '.tag_name')
  else
    tag_name=$(echo "$release_json" | grep -o '"tag_name":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi

  # Find the macOS asset
  local download_url

  if command -v jq &>/dev/null; then
    download_url=$(echo "$release_json" | jq -r ".assets[]? | select(.name | test(\"darwin_${arch}\\.tar\\.gz\$\")) | .browser_download_url" | head -1)
  else
    download_url=$(echo "$release_json" | grep -o "\"browser_download_url\":\"[^\"]*darwin_${arch}\.tar\.gz\"" | head -1 | cut -d'"' -f4)
  fi

  if [ -z "$download_url" ]; then
    fail "Could not find macOS $arch release in $tag_name. Check https://github.com/openai/tunnel-client/releases"
  fi

  echo "  Release : $tag_name"
  echo "  Asset   : $(basename "$download_url")"
  echo "  URL     : $download_url"
  echo ""

  # Download
  mkdir -p "$INSTALL_DIR"
  local tmp_tar="$INSTALL_DIR/tunnel-client.tar.gz"
  curl -L --progress-bar -o "$tmp_tar" "$download_url"

  # Verify checksum if available
  local checksum_url="${download_url}.sha256"
  local tmp_checksum="$INSTALL_DIR/checksum.sha256"
  if curl -sL -o "$tmp_checksum" "$checksum_url" 2>/dev/null && [ -s "$tmp_checksum" ]; then
    echo -e "${BOLD}Verifying SHA-256 checksum…${NC}"
    local expected_hash
    expected_hash=$(awk '{print $1}' "$tmp_checksum")
    local actual_hash
    actual_hash=$(shasum -a 256 "$tmp_tar" | awk '{print $1}')
    if [ "$expected_hash" = "$actual_hash" ]; then
      info "Checksum verified ✓"
    else
      warn "Checksum mismatch!"
      echo "  Expected: $expected_hash"
      echo "  Actual:   $actual_hash"
      fail "Downloaded file may be corrupted. Please try again."
    fi
    rm -f "$tmp_checksum"
  else
    warn "No checksum file available — skipping verification."
    rm -f "$tmp_checksum"
  fi

  # Extract
  echo ""
  echo -e "${BOLD}Extracting…${NC}"
  tar -xzf "$tmp_tar" -C "$INSTALL_DIR"
  rm -f "$tmp_tar"

  # Make executable
  chmod +x "$INSTALL_DIR/tunnel-client" 2>/dev/null || true

  if [ -f "$INSTALL_DIR/tunnel-client" ]; then
    info "tunnel-client installed at: $INSTALL_DIR/tunnel-client"
    local tc_version
    tc_version=$("$INSTALL_DIR/tunnel-client" --version 2>&1 || echo "unknown")
    info "Version: $tc_version"
  else
    local found
    found=$(find "$INSTALL_DIR" -name "tunnel-client" -type f | head -1)
    if [ -n "$found" ]; then
      chmod +x "$found"
      info "tunnel-client installed at: $found"
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
  echo -e "${CYAN}│   Nonny Tunnel Setup UI is running at:       │${NC}"
  echo -e "${CYAN}│   ${BOLD}http://localhost:3847${NC}${CYAN}                      │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}│   Configure your Tunnel ID and API Key       │${NC}"
  echo -e "${CYAN}│   Press Ctrl+C to close when done.           │${NC}"
  echo -e "${CYAN}│                                              │${NC}"
  echo -e "${CYAN}└──────────────────────────────────────────────┘${NC}"
  echo ""

  # Open browser
  open "http://localhost:3847" 2>/dev/null || true

  node server.js
}

# ── Main ─────────────────────────────────────────────────────
banner
check_prereqs
download_tunnel_client
launch_web_ui
