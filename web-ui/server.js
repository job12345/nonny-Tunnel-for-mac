/**
 * Nonny Tunnel for Mac — Optimized Web UI Backend
 * Developed by mr.j
 */
const express = require("express");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const util = require("util");

// Ensure ~/.local/bin is in PATH for uv and serena tools
process.env.PATH = `${path.join(os.homedir(), ".local", "bin")}:${process.env.PATH}`;

const execPromise = util.promisify(exec);
const app = express();
const PORT = 3847;
const ROOT = path.resolve(__dirname, "..");
const CONFIG_DIR = path.join(ROOT, "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "team.env");
const PROFILE_TEMPLATE = path.join(ROOT, "profiles", "nonny-tunnel.yaml");

const KEYCHAIN_ACCOUNT = "nonny-tunnel";
const KEYCHAIN_SERVICE = "openai-runtime-api-key";

// Tunnel state
let tunnelProcess = null;
let tunnelLogs = [];
const MAX_LOGS = 200;

// Cache for system checks
let systemCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 30000; // 30 seconds

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ──────────────────────────────────────────────────

async function runCmd(cmd, timeout = 5000) {
  try {
    const { stdout } = await execPromise(cmd, {
      timeout,
      env: process.env,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

function runCmdSync(cmd) {
  try {
    const { execSync } = require("child_process");
    return execSync(cmd, {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    }).trim();
  } catch {
    return null;
  }
}

function getKeychainKey() {
  return runCmdSync(`security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w`);
}

function setKeychainKey(key) {
  const res = runCmdSync(`security add-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w "${key}" -U`);
  return res !== null;
}

function deleteKeychainKey() {
  return runCmdSync(`security delete-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}"`);
}

function getTunnelId() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    const content = fs.readFileSync(CONFIG_FILE, "utf8");
    const match = content.match(/TUNNEL_ID=(.+)/);
    return match ? match[1].trim().replace(/['"]/g, "") : null;
  } catch {
    return null;
  }
}

function setTunnelId(id) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `TUNNEL_ID=${id}\n`, "utf8");
}

function findTunnelClient() {
  const direct = path.join(ROOT, "tunnel-client", "tunnel-client");
  if (fs.existsSync(direct)) return direct;
  try {
    const found = runCmdSync(`find "${path.join(ROOT, "tunnel-client")}" -name "tunnel-client" -type f 2>/dev/null | head -1`);
    return found || null;
  } catch {
    return null;
  }
}

function ensureProfile(tunnelId) {
  const profileDir = path.join(os.homedir(), ".config", "tunnel-client");
  const profilePath = path.join(profileDir, "nonny-tunnel.yaml");
  fs.mkdirSync(profileDir, { recursive: true });
  const template = fs.readFileSync(PROFILE_TEMPLATE, "utf8");
  fs.writeFileSync(profilePath, template.replace(/__TUNNEL_ID__/g, tunnelId));
  return profilePath;
}

// ── API Routes ───────────────────────────────────────────────

app.get("/api/status", async (req, res) => {
  const now = Date.now();
  const forceRefresh = req.query.refresh === "1";

  if (!forceRefresh && systemCache.data && now - systemCache.timestamp < CACHE_TTL) {
    const tunnelId = getTunnelId();
    const hasApiKey = !!getKeychainKey();
    const ready =
      systemCache.data.checks.mcpServer.installed &&
      systemCache.data.checks.tunnelClient.installed &&
      !!tunnelId &&
      hasApiKey;

    return res.json({
      ...systemCache.data,
      checks: {
        ...systemCache.data.checks,
        credentials: {
          tunnelId,
          hasTunnelId: !!tunnelId,
          hasApiKey,
        },
      },
      ready,
      cached: true,
    });
  }

  const [curlPath, uvPath, mcpPath] = await Promise.all([
    runCmd("which curl"),
    runCmd("which uv"),
    runCmd("which serena"),
  ]);

  const [curlVer, uvVer, mcpVer] = await Promise.all([
    curlPath ? runCmd("curl --version | head -1") : Promise.resolve(null),
    uvPath ? runCmd("uv --version") : Promise.resolve(null),
    mcpPath ? runCmd("serena --version 2>&1") : Promise.resolve(null),
  ]);

  const tcPath = findTunnelClient();
  const tcVer = tcPath ? await runCmd(`"${tcPath}" --version 2>&1`) : null;

  const tunnelId = getTunnelId();
  const hasApiKey = !!getKeychainKey();

  const checks = {
    curl: { installed: !!curlPath, path: curlPath, version: curlVer },
    node: { installed: true, path: process.execPath, version: process.version },
    uv: { installed: !!uvPath, path: uvPath, version: uvVer },
    mcpServer: { installed: !!mcpPath, path: mcpPath, version: mcpVer },
    tunnelClient: { installed: !!tcPath, path: tcPath, version: tcVer },
    credentials: {
      tunnelId,
      hasTunnelId: !!tunnelId,
      hasApiKey,
    },
    system: {
      arch: os.arch(),
      platform: os.platform(),
      hostname: os.hostname(),
    },
  };

  const ready =
    checks.mcpServer.installed &&
    checks.tunnelClient.installed &&
    checks.credentials.hasTunnelId &&
    checks.credentials.hasApiKey;

  systemCache = {
    data: { checks, ready },
    timestamp: now,
  };

  res.json({ checks, ready, cached: false });
});

app.post("/api/configure", (req, res) => {
  const { tunnelId, apiKey } = req.body;

  if (tunnelId) {
    if (!/^tunnel_[0-9a-f]{32}$/.test(tunnelId)) {
      return res.status(400).json({
        error: "Invalid Tunnel ID format. Expected tunnel_ followed by 32 lowercase hex characters.",
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
    const ok = setKeychainKey(apiKey);
    if (!ok) {
      deleteKeychainKey();
      if (!setKeychainKey(apiKey)) {
        return res.status(500).json({ error: "Failed to save API key to macOS Keychain." });
      }
    }
  }

  systemCache.timestamp = 0;

  res.json({
    success: true,
    tunnelId: tunnelId || getTunnelId(),
    hasApiKey: !!getKeychainKey(),
  });
});

app.post("/api/configure/delete-key", (req, res) => {
  deleteKeychainKey();
  systemCache.timestamp = 0;
  res.json({ success: true, hasApiKey: false });
});

app.post("/api/test-connection", async (req, res) => {
  const tcPath = findTunnelClient();
  if (!tcPath) {
    return res.status(400).json({ error: "tunnel-client is not installed yet. Run setup.sh first." });
  }

  const tunnelId = req.body.tunnelId || getTunnelId();
  const apiKey = req.body.apiKey || getKeychainKey();

  if (!tunnelId) return res.status(400).json({ error: "Tunnel ID is missing." });
  if (!apiKey) return res.status(400).json({ error: "API Key is missing." });

  ensureProfile(tunnelId);

  try {
    const { stdout, stderr } = await execPromise(
      `"${tcPath}" doctor --profile nonny-tunnel --explain`,
      {
        env: { ...process.env, CONTROL_PLANE_API_KEY: apiKey },
        timeout: 10000,
      }
    );
    const output = (stdout + "\n" + (stderr || "")).trim();
    const passed = !output.toLowerCase().includes("fail") && !output.toLowerCase().includes("error");

    res.json({
      success: passed,
      output,
    });
  } catch (err) {
    res.json({
      success: false,
      output: err.stdout || err.stderr || err.message,
    });
  }
});

app.get("/api/tunnel/status", (req, res) => {
  const running = tunnelProcess !== null && !tunnelProcess.killed;
  res.json({
    running,
    pid: running ? tunnelProcess.pid : null,
    logs: tunnelLogs.slice(-60),
  });
});

app.post("/api/tunnel/start", (req, res) => {
  if (tunnelProcess && !tunnelProcess.killed) {
    return res.status(409).json({ error: "Tunnel is already running." });
  }

  const tcPath = findTunnelClient();
  if (!tcPath) {
    return res.status(400).json({ error: "tunnel-client not installed. Run ./setup.sh first." });
  }

  const tunnelId = getTunnelId();
  if (!tunnelId) return res.status(400).json({ error: "Tunnel ID not configured." });

  const apiKey = getKeychainKey();
  if (!apiKey) return res.status(400).json({ error: "API key not found in Keychain." });

  ensureProfile(tunnelId);

  tunnelLogs = [];
  tunnelLogs.push(`[${new Date().toLocaleTimeString()}] Starting Nonny Tunnel daemon...`);

  const env = { ...process.env, CONTROL_PLANE_API_KEY: apiKey };

  tunnelProcess = spawn(tcPath, ["start", "--profile", "nonny-tunnel"], {
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
    tunnelLogs.push(`[${new Date().toLocaleTimeString()}] Tunnel stopped (Exit code ${code})`);
    tunnelProcess = null;
  });

  tunnelProcess.on("error", (err) => {
    tunnelLogs.push(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
    tunnelProcess = null;
  });

  res.json({ success: true, pid: tunnelProcess.pid });
});

app.post("/api/tunnel/stop", (req, res) => {
  if (!tunnelProcess || tunnelProcess.killed) {
    return res.status(409).json({ error: "Tunnel is not running." });
  }

  tunnelProcess.kill("SIGTERM");
  tunnelLogs.push(`[${new Date().toLocaleTimeString()}] Stopping tunnel...`);
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const cleanup = () => {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGTERM");
  }
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

app.listen(PORT, () => {
  console.log(`\n  ⚡ Nonny Tunnel Web UI: http://localhost:${PORT}\n`);
});
