# ⚡ Nonny Tunnel & Nonny Swarm for Mac

Connect **ChatGPT** to your **local workspace** securely on macOS, and orchestrate an **Autonomous Multi-Agent AI Team** with a live Kanban board and Inter-Agent Chat Feed.

**Developed by mr.j**

🇹🇭 ภาษาไทย: [README.th.md](README.th.md)

---

## 🌟 Two Powerful Systems in One

### 1. 🔐 Nonny Tunnel
Direct bridge connecting ChatGPT to your Mac workspace via **OpenAI Secure MCP Tunnel** without exposing your server to the internet.
- Credentials encrypted in **macOS Keychain**
- Real-time tunnel control dashboard at `http://localhost:3847`
- Ultra-fast start mode (`./start.sh --fast`)

### 2. 👥 Nonny Swarm (Multi-Agent Team Orchestrator)
Turn AI into a full development agency!
- 🧠 **AI Manager (Architect)**: Plans projects, breaks down tickets into a Kanban board, and reviews code.
- 🤖 **ChatGPT Web Workers**: Code simultaneously across frontend, backend, database, and testing via Nonny Tunnel.
- 📊 **Real-Time Glassmorphism Dashboard (`http://localhost:3847/swarm`)**:
  - **Live Kanban Board**: Backlog ➔ Coding ➔ Review ➔ Completed
  - **💬 Inter-Agent Live Chat Feed**: Watch the Manager assign tickets, workers report code changes, and manager reviews in real time!
  - **Worker Fleet Monitor**: Live status of all workers (Idle / Working / Reviewing / Done).

---

## Architecture

```
                       [ 👤 Project Goal in Dashboard ]
                                      │
                                      ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │  🧠 Manager Engine (Gemini / OpenAI / Ollama / Smart Heuristic)  │
    │  - Breaks down tasks into Kanban tickets                         │
    │  - Dispatches tasks to Workers                                   │
    │  - Reviews code & evaluates completion                           │
    └─────────────────┬──────────────────────────────┬─────────────────┘
                      │ Real-time Event Stream (SSE) │
                      ▼                              ▼
    ┌──────────────────────────────────┐ ┌──────────────────────────────────┐
    │ 🤖 Worker 1 (Frontend & UI)      │ │ 🤖 Worker 2 (Backend & Logic)    │
    │ (ChatGPT Web + Nonny Tunnel)     │ │ (ChatGPT Web + Nonny Tunnel)     │
    │ - Writes UI Components & CSS     │ │ - Writes API & Database Schema   │
    └──────────────────────────────────┘ └──────────────────────────────────┘
```

---

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/job12345/nonny-Tunnel-for-mac.git
cd nonny-Tunnel-for-mac
./setup.sh
```

### 2. Access the Dashboards

- 🔐 **Nonny Tunnel Setup & Credentials**: `http://localhost:3847`
- 👥 **Nonny Swarm Multi-Agent Dashboard**: `http://localhost:3847/swarm`

---

## Features

- 🍎 **Built natively for macOS** (Apple Silicon M1-M4 & Intel)
- 🔐 **Zero-Plaintext Security** (macOS Keychain encryption)
- 💬 **Live Inter-Agent Dialogue Stream**
- 📌 **Real-Time Kanban State Machine**
- ⚡ **Multi-Model Support** (Google Gemini 2.0 Flash Free Tier, GPT-4o, Ollama Local)

---

## License

MIT License — see [LICENSE](LICENSE)

**Made with ⚡ by mr.j**
