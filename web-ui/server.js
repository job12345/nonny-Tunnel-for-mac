/**
 * Nonny Tunnel for Mac — Web UI Backend
 * Developed by mr.j
 */
const express = require("express");
const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = 3847;
const ROOT = path.resolve(__dirname, "..");
const CONFIG_DIR = path.join(ROOT, "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "team.env");
const PROFILE_TEMPLATE = path.join(ROOT, "profiles", "nonny-tunnel.yaml");

const KEYCHAIN_ACCOUNT = "nonny-tunnel";
const KEYCHAIN_SERVICE = "openai-runtime-api-key";

// Track tunnel process
let tunnelProcess = null;
let tunnelLogs = [];
const MAX_LOGS = 200;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ──────────────────────────────────────────────────

function runCmd(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
      ...opts,
    }).trim();
  } catch (e) {
    return null;
  }
}

function getKeychainKey() {
  return runCmd(
    `security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w`
  );
}

function setKeychainKey(key) {
  const result = runCmd(
    `security add-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w "${key}" -U`
  );
  return result !== null;
}

function deleteKeychainKey() {
  return runCmd(
    `security delete-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}"`
  );
}

function getTunnelId() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const content = fs.readFileSync(CONFIG_FILE, "utf8");
  const match = content.match(/TUNNEL_ID=(.+)/);
  return match ? match[1].trim().replace(/['"]/g, "") : null;
}

function setTunnelId(id) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `TUNNEL_ID=${id}\n`, "utf8");
}

function findTunnelClient() {
  const direct = path.join(ROOT, "tunnel-client", "tunnel-client");
  if (fs.existsSync(direct)) return direct;
  try {
    const found = runCmd(
      `find "${path.join(ROOT, "tunnel-client")}" -name "tunnel-client" -type f 2>/dev/null | head -1`
    );
    return found || null;
  } catch {
    return null;
  }
}

// ── API Routes ───────────────────────────────────────────────

// GET /api/status — Check all prerequisites
app.get("/api/status", (req, res) => {
  const checks = {};

  // curl
  const curlPath = runCmd("which curl");
  checks.curl = {
    installed: !!curlPath,
    path: curlPath,
    version: curlPath ? runCmd("curl --version | head -1") : null,
  };

  // uv
  const uvPath = runCmd("which uv");
  checks.uv = {
    installed: !!uvPath,
    path: uvPath,
    version: uvPath ? runCmd("uv --version") : null,
  };

  // MCP Server
  const mcpPath = runCmd("which serena");
  checks.mcpServer = {
    installed: !!mcpPath,
    path: mcpPath,
    version: mcpPath ? runCmd("serena --version 2>&1") : null,
  };

  // node
  checks.node = {
    installed: true,
    path: process.execPath,
    version: process.version,
  };

  // tunnel-client
  const tcPath = findTunnelClient();
  checks.tunnelClient = {
    installed: !!tcPath,
    path: tcPath,
    version: tcPath ? runCmd(`"${tcPath}" --version 2>&1`) : null,
  };

  // Credentials
  const tunnelId = getTunnelId();
  const hasApiKey = !!getKeychainKey();

  checks.credentials = {
    tunnelId: tunnelId,
    hasTunnelId: !!tunnelId,
    hasApiKey: hasApiKey,
  };

  // Architecture
  checks.system = {
    arch: os.arch(),
    platform: os.platform(),
    hostname: os.hostname(),
  };

  // Overall readiness
  const ready =
    checks.mcpServer.installed &&
    checks.tunnelClient.installed &&
    checks.credentials.hasTunnelId &&
    checks.credentials.hasApiKey;

  res.json({ checks, ready });
});

// POST /api/configure — Save Tunnel ID + API Key
app.post("/api/configure", (req, res) => {
  const { tunnelId, apiKey } = req.body;

  if (tunnelId) {
    if (!/^tunnel_[0-9a-f]{32}$/.test(tunnelId)) {
      return res.status(400).json({
        error: "Invalid Tunnel ID format. Expected: tunnel_ followed by 32 lowercase hexadecimal characters.",
      });
    }
    setTunnelId(tunnelId);
  }

  if (apiKey) {
    if (!apiKey.startsWith("sk-")) {
      return res.status(400).json({
        error: 'Invalid API Key format. Expected key starting with "sk-".',
      });
    }
    const success = setKeychainKey(apiKey);
    if (!success) {
      deleteKeychainKey();
      const retry = setKeychainKey(apiKey);
      if (!retry) {
        return res.status(500).json({
          error: "Failed to save API key to macOS Keychain.",
        });
      }
    }
  }

  res.json({
    success: true,
    tunnelId: tunnelId || getTunnelId(),
    hasApiKey: !!getKeychainKey(),
  });
});

// POST /api/configure/delete-key — Remove API Key from Keychain
app.post("/api/configure/delete-key", (req, res) => {
  deleteKeychainKey();
  res.json({ success: true, hasApiKey: false });
});

// GET /api/tunnel/status — Tunnel daemon status
app.get("/api/tunnel/status", (req, res) => {
  const running = tunnelProcess !== null && !tunnelProcess.killed;
  res.json({
    running,
    pid: running ? tunnelProcess.pid : null,
    logs: tunnelLogs.slice(-50),
  });
});

// POST /api/tunnel/start — Start the tunnel daemon
app.post("/api/tunnel/start", (req, res) => {
  if (tunnelProcess && !tunnelProcess.killed) {
    return res.status(409).json({ error: "Tunnel is already running." });
  }

  const tcPath = findTunnelClient();
  if (!tcPath) {
    return res.status(400).json({ error: "tunnel-client not installed. Run ./setup.sh first." });
  }

  if (!runCmd("which serena")) {
    return res.status(400).json({ error: "MCP Server not found in PATH." });
  }

  const tunnelId = getTunnelId();
  if (!tunnelId) {
    return res.status(400).json({ error: "Tunnel ID not configured." });
  }

  const apiKey = getKeychainKey();
  if (!apiKey) {
    return res.status(400).json({ error: "API key not found in Keychain." });
  }

  // Build profile
  const profileName = "nonny-tunnel";
  const profileDir = path.join(os.homedir(), ".config", "tunnel-client");
  const profilePath = path.join(profileDir, `${profileName}.yaml`);

  fs.mkdirSync(profileDir, { recursive: true });
  const template = fs.readFileSync(PROFILE_TEMPLATE, "utf8");
  fs.writeFileSync(profilePath, template.replace(/__TUNNEL_ID__/g, tunnelId));

  // Clear logs
  tunnelLogs = [];
  tunnelLogs.push(`[${new Date().toISOString()}] Starting Nonny Tunnel with profile: ${profileName}`);

  // Start tunnel
  const env = { ...process.env, CONTROL_PLANE_API_KEY: apiKey };

  tunnelProcess = spawn(tcPath, ["start", "--profile", profileName], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  tunnelProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      tunnelLogs.push(line);
      if (tunnelLogs.length > MAX_LOGS) tunnelLogs.shift();
    }
  });

  tunnelProcess.stderr.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      tunnelLogs.push(`[stderr] ${line}`);
      if (tunnelLogs.length > MAX_LOGS) tunnelLogs.shift();
    }
  });

  tunnelProcess.on("close", (code) => {
    tunnelLogs.push(`[${new Date().toISOString()}] Tunnel process exited with code ${code}`);
    tunnelProcess = null;
  });

  tunnelProcess.on("error", (err) => {
    tunnelLogs.push(`[${new Date().toISOString()}] Error: ${err.message}`);
    tunnelProcess = null;
  });

  res.json({ success: true, pid: tunnelProcess.pid });
});

// POST /api/tunnel/stop — Stop the tunnel daemon
app.post("/api/tunnel/stop", (req, res) => {
  if (!tunnelProcess || tunnelProcess.killed) {
    return res.status(409).json({ error: "Tunnel is not running." });
  }

  tunnelProcess.kill("SIGTERM");
  tunnelLogs.push(`[${new Date().toISOString()}] Tunnel stop requested.`);

  res.json({ success: true });
});

// GET /api/tunnel/logs — Stream latest logs
app.get("/api/tunnel/logs", (req, res) => {
  res.json({ logs: tunnelLogs.slice(-100) });
});

// ── Serve SPA ────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Cleanup on exit ──────────────────────────────────────────
process.on("SIGINT", () => {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGTERM");
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGTERM");
  }
  process.exit(0);
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 Nonny Tunnel UI running at http://localhost:${PORT}\n`);
});
