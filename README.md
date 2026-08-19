# ⚡ Nonny Tunnel for Mac

Connect **ChatGPT** to your **local workspace** securely on macOS — without exposing your MCP server to the public internet.

**Developed by mr.j**

🇹🇭 ภาษาไทย: [README.th.md](README.th.md)

---

## What is this?

Nonny Tunnel creates a secure bridge between ChatGPT and your local machine using **OpenAI Secure MCP Tunnel**. This allows ChatGPT to read, write, and manage files in your local project — all through an encrypted tunnel.

```
ChatGPT
    │
    ▼
OpenAI Secure MCP Tunnel (Cloud)
    │  encrypted connection
    ▼
tunnel-client (your Mac)
    │  stdio
    ▼
MCP Server (local)
    │
    ▼
Your Project Files
```

### Features

- 🍎 **Built for macOS** — Apple Silicon (M1/M2/M3/M4) and Intel supported
- 🔐 **Secure credential storage** — API keys encrypted in macOS Keychain
- 🖥 **Web-based Setup UI** — beautiful dashboard for configuration and tunnel management
- 📦 **One-command setup** — automatic tunnel-client download with SHA-256 verification
- 📋 **Live log viewer** — monitor tunnel activity in real-time
- 🚀 **Easy daily use** — just run `./start.sh`

---

## Requirements

| Requirement | How to install |
|---|---|
| macOS 10.15+ | — |
| Node.js 18+ | `brew install node` or [nodejs.org](https://nodejs.org) |
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| MCP Server | `uv tool install -p 3.13 serena-agent && serena init` |
| OpenAI Tunnel ID | [Create at OpenAI Platform](https://platform.openai.com/settings/organization/tunnels) |
| OpenAI Runtime API Key | Permission: **Tunnels Read + Use** |
| ChatGPT developer mode | Enable in your workspace |

---

## Quick Start

### 1. Download

```bash
git clone https://github.com/job12345/nonny-Tunnel-for-mac.git
cd nonny-Tunnel-for-mac
```

### 2. Run Setup

```bash
./setup.sh
```

This will:
1. ✅ Check all prerequisites (curl, uv, MCP Server, Node.js)
2. 📱 Auto-detect your Mac architecture (Apple Silicon / Intel)
3. ⬇️ Download the latest `tunnel-client` binary from GitHub
4. 🔒 Verify SHA-256 checksum
5. 🌐 Open the **Web Setup UI** at `http://localhost:3847`

### 3. Configure (Web UI)

The Setup UI has 3 tabs:

| Tab | What it does |
|---|---|
| **① Prerequisites** | Shows what's installed ✅ and what's missing ❌ |
| **② Configuration** | Enter your Tunnel ID + API Key (saved to Keychain) |
| **③ Tunnel** | Start/Stop tunnel + live log viewer |

### 4. Daily Use

After initial setup, just run:

```bash
./start.sh
```

Or to change credentials:

```bash
./configure.sh
```

### 5. Connect in ChatGPT

1. Open [ChatGPT Plugins](https://chatgpt.com/plugins)
2. Click **+** to create a developer-mode app
3. Choose **Tunnel** under Connection
4. Select your tunnel or paste the Tunnel ID
5. Start chatting! Tell ChatGPT:

```
Activate the project /path/to/your/project, then show the current configuration.
```

---

## File Structure

```
nonny-Tunnel-for-mac/
├── setup.sh              # First-time setup
├── configure.sh          # Change credentials
├── start.sh              # Start tunnel (daily use)
├── profiles/
│   └── nonny-tunnel.yaml # Tunnel profile template
├── config/
│   ├── README.md
│   └── team.env          # Tunnel ID (gitignored)
├── web-ui/
│   ├── package.json
│   ├── server.js         # Backend API
│   └── public/
│       └── index.html    # Dashboard UI
├── .gitignore
├── README.md             # English docs
├── README.th.md          # Thai docs
└── LICENSE
```

---

## Security

| Feature | Details |
|---|---|
| **API Key Storage** | macOS Keychain — per-user encryption, protected by login password / Touch ID |
| **Tunnel ID** | Stored in `config/team.env` (gitignored) |
| **Git Safety** | Credentials excluded by `.gitignore` |
| **Key Type** | Always use **Runtime API key** — never Admin |

### ⚠️ Important

- Never use an OpenAI Admin API key for the tunnel daemon
- Never share API keys in issues, screenshots, or commits
- Stop `start.sh` (Ctrl+C) when the tunnel is not in use
- Review tool calls before approving in ChatGPT
- Only activate trusted local projects

---

## Troubleshooting

### MCP Server not found
```bash
# Install
uv tool install -p 3.13 serena-agent
serena init

# Verify
serena --help
```

### tunnel-client not downloaded
```bash
# Re-run setup
./setup.sh
```

### Tunnel preflight failed
Check the `doctor --explain` output in the start window. Common causes:
- Invalid or expired Runtime API key
- Tunnel ID associated with wrong organization/workspace
- MCP Server command not working

### Tunnel ready but not visible in ChatGPT
1. Tunnel is associated with the correct ChatGPT workspace
2. Your account has **Tunnels Read + Use** permission
3. Developer mode is enabled in that workspace

---

## Official References

- [OpenAI Secure MCP Tunnel Guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
- [tunnel-client Releases](https://github.com/openai/tunnel-client/releases)
- [OpenAI Platform — Tunnels](https://platform.openai.com/settings/organization/tunnels)

---

## License

MIT License — see [LICENSE](LICENSE)

---

**Made with ⚡ by mr.j**
