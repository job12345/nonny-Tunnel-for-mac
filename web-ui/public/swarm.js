/**
 * Nonny Swarm — Real-Time Dashboard Client
 * Developed by mr.j
 */

let eventSource = null;
let currentSnapshot = null;

// ── SSE Real-Time Connection ─────────────────────────────────

function initSSE() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource("/api/swarm/events");

  eventSource.onmessage = (event) => {
    try {
      const { type, payload } = JSON.parse(event.data);

      if (type === "init" || type === "state") {
        currentSnapshot = payload;
        renderAll();
      } else if (type === "chat") {
        appendChatMessage(payload);
      } else if (type === "log") {
        appendLog(payload);
      } else if (type === "task" || type === "worker") {
        fetchState();
      }
    } catch (e) {
      console.error("[SSE Parse Error]", e);
    }
  };

  eventSource.onerror = () => {
    setTimeout(initSSE, 3000);
  };
}

async function fetchState() {
  try {
    const res = await fetch("/api/swarm/state");
    currentSnapshot = await res.json();
    renderAll();
  } catch {}
}

// ── Render Functions ─────────────────────────────────────────

function renderAll() {
  if (!currentSnapshot) return;

  renderStatus();
  renderProgress();
  renderKanban();
  renderWorkers();
  renderChatHistory();
}

function renderStatus() {
  const badge = document.getElementById("mission-status-badge");
  const startBtn = document.getElementById("btn-start-mission");
  const pauseBtn = document.getElementById("btn-pause-mission");
  const stopBtn = document.getElementById("btn-stop-mission");

  const status = currentSnapshot.status || "IDLE";
  badge.className = `status-badge ${status}`;
  badge.textContent = `● ${status}`;

  const isRunning = status === "RUNNING" || status === "PLANNING" || status === "PAUSED";
  startBtn.disabled = isRunning;
  startBtn.textContent = isRunning ? "⚡ Running..." : "🚀 Launch Team";
  pauseBtn.disabled = !isRunning;
  pauseBtn.textContent = status === "PAUSED" ? "▶ Resume" : "⏸ Pause";
  stopBtn.disabled = !isRunning;
}

function renderProgress() {
  const percentEl = document.getElementById("progress-percent");
  const fillEl = document.getElementById("progress-fill");
  const summaryEl = document.getElementById("progress-summary");

  const p = currentSnapshot.progress || 0;
  percentEl.textContent = `${p}%`;
  fillEl.style.width = `${p}%`;

  if (currentSnapshot.projectSummary) {
    summaryEl.textContent = currentSnapshot.projectSummary;
  } else if (currentSnapshot.status === "PLANNING") {
    summaryEl.textContent = "🧠 Architect Manager is breaking down tasks...";
  } else if (currentSnapshot.status === "COMPLETED") {
    summaryEl.textContent = "🎉 All project tasks completed and verified!";
  } else {
    summaryEl.textContent = "Ready to launch mission...";
  }
}

function renderKanban() {
  const tasks = currentSnapshot.tasks || [];
  document.getElementById("kanban-task-count").textContent = `${tasks.length} tasks`;

  const cols = {
    todo: document.getElementById("cards-todo"),
    in_progress: document.getElementById("cards-in_progress"),
    review: document.getElementById("cards-review"),
    done: document.getElementById("cards-done"),
  };

  const counts = {
    todo: document.getElementById("count-todo"),
    in_progress: document.getElementById("count-in_progress"),
    review: document.getElementById("count-review"),
    done: document.getElementById("count-done"),
  };

  // Reset columns
  Object.values(cols).forEach((el) => (el.innerHTML = ""));

  const grouped = { todo: 0, in_progress: 0, review: 0, done: 0 };

  tasks.forEach((task) => {
    const status = task.status || "todo";
    grouped[status] = (grouped[status] || 0) + 1;

    const card = document.createElement("div");
    card.className = `task-card ${status === "in_progress" || status === "review" ? "active-task" : ""}`;

    const worker = currentSnapshot.workers?.find((w) => w.id === task.assignedToWorker);
    const workerColor = worker?.color || "#a855f7";

    card.innerHTML = `
      <div class="card-id">${esc(task.id)} · ${esc(task.priority || "NORMAL")}</div>
      <div class="card-title">${esc(task.title)}</div>
      <div class="card-footer">
        <span class="worker-badge" style="background: rgba(255,255,255,0.06); color: ${workerColor};">
          🤖 ${esc(worker?.name || `Worker ${task.assignedToWorker}`)}
        </span>
        <span style="color: var(--text-muted); font-size:10px;">${esc(task.role || "")}</span>
      </div>
      ${task.reviewNotes ? `<div style="margin-top:6px; font-size:11px; color:var(--success); border-top:1px solid var(--border); padding-top:4px;">✓ ${esc(task.reviewNotes)}</div>` : ""}
    `;

    if (cols[status]) {
      cols[status].appendChild(card);
    }
  });

  // Update counts
  Object.keys(counts).forEach((k) => {
    counts[k].textContent = grouped[k] || 0;
  });

  // Empty state for todo
  if (grouped.todo === 0 && tasks.length === 0) {
    cols.todo.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:20px 0;">No tasks yet</div>';
  }
}

function renderWorkers() {
  const grid = document.getElementById("worker-grid");
  const workers = currentSnapshot.workers || [];

  if (workers.length === 0) {
    grid.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No active workers</div>';
    return;
  }

  grid.innerHTML = workers
    .map((w) => {
      const statusClass = w.status || "idle";
      return `
      <div class="worker-item">
        <div class="worker-header">
          <div class="worker-name" style="color: ${w.color || "#a855f7"}">
            <span>🤖</span> ${esc(w.name)}
          </div>
          <span class="worker-status-chip ${statusClass}">${esc(statusClass)}</span>
        </div>
        <div class="worker-role">${esc(w.role)}</div>
        <div style="font-size:11px; color:var(--text-secondary); display:flex; justify-content:space-between;">
          <span>Current Task: <strong>${w.currentTaskId || "—"}</strong></span>
          <span>Done: ${w.completedTasksCount || 0}</span>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderChatHistory() {
  const feed = document.getElementById("chat-feed");
  const messages = currentSnapshot.messages || [];

  if (messages.length === 0) {
    feed.innerHTML = '<div class="chat-bubble system"><span>Waiting for mission to start...</span></div>';
    return;
  }

  feed.innerHTML = "";
  messages.forEach((msg) => appendChatMessage(msg, false));
  feed.scrollTop = feed.scrollHeight;
}

function appendChatMessage(msg, autoScroll = true) {
  const feed = document.getElementById("chat-feed");
  const bubble = document.createElement("div");

  const isManager = msg.from === "Manager";
  const isSystem = msg.from === "System";
  const typeClass = isSystem ? "system" : isManager ? "manager" : "worker";

  bubble.className = `chat-bubble ${typeClass}`;
  bubble.innerHTML = `
    <div class="bubble-meta">
      <span class="sender">
        ${isSystem ? "⚙️" : isManager ? "🧠" : "🤖"}
        ${esc(msg.from)} ➔ ${esc(msg.to || "All")}
      </span>
      <span>${esc(msg.timestamp || "")}</span>
    </div>
    <div class="bubble-content">${esc(msg.text || "")}</div>
  `;

  feed.appendChild(bubble);
  if (autoScroll) {
    feed.scrollTop = feed.scrollHeight;
  }
}

function appendLog(logText) {
  const logEl = document.getElementById("terminal-logs");
  logEl.textContent += `\n${logText}`;
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLogs() {
  document.getElementById("terminal-logs").textContent = "[System] Logs cleared.";
}

// ── Control Actions ──────────────────────────────────────────

async function startMission() {
  const goal = document.getElementById("input-goal").value.trim();
  const projectPath = document.getElementById("input-project-path").value.trim();
  const workerCount = document.getElementById("select-workers").value;
  const managerProvider = document.getElementById("select-manager").value;

  if (!goal) {
    alert("Please enter a project goal or objective.");
    return;
  }

  const btn = document.getElementById("btn-start-mission");
  btn.disabled = true;
  btn.textContent = "⏳ Launching...";

  try {
    const res = await fetch("/api/swarm/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        projectPath,
        workerCount,
        managerProvider,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to start mission.");
      btn.disabled = false;
      btn.textContent = "🚀 Launch Team";
    }
  } catch (e) {
    alert("Network error: " + e.message);
    btn.disabled = false;
  }
}

async function stopMission() {
  if (!confirm("Are you sure you want to stop the swarm mission?")) return;
  try {
    await fetch("/api/swarm/stop", { method: "POST" });
  } catch (e) {
    alert("Error stopping mission: " + e.message);
  }
}

async function togglePause() {
  try {
    await fetch("/api/swarm/pause", { method: "POST" });
  } catch {}
}

function esc(s) {
  return (s || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Init ─────────────────────────────────────────────────────
initSSE();
fetchState();
