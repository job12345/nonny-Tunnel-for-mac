/**
 * Nonny Swarm — State Store & Event Bus
 * Developed by mr.j
 */
const { EventEmitter } = require("events");

class SwarmState extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.status = "IDLE"; // IDLE, PLANNING, RUNNING, PAUSED, COMPLETED, ERROR
    this.projectGoal = "";
    this.projectSummary = "";
    this.projectPath = "";
    this.startTime = null;
    this.endTime = null;

    // Kanban Board columns
    this.tasks = []; // Array of task objects: { id, title, description, role, assignedToWorker, status: 'todo'|'in_progress'|'review'|'done', progress: 0-100 }

    // Worker registry
    this.workers = []; // Array of { id, name, role, status: 'idle'|'working'|'reviewing'|'done'|'error', currentTaskId, color }

    // Inter-agent chat transcripts
    this.messages = []; // Array of { id, from: 'Manager'|'Worker-1'|'System', to, text, taskId, timestamp, type: 'instruction'|'report'|'review'|'system' }

    // Execution logs
    this.logs = [];

    this.emitStateChange();
  }

  initSwarm(goal, projectPath, workerCount = 2) {
    this.reset();
    this.status = "PLANNING";
    this.projectGoal = goal;
    this.projectPath = projectPath;
    this.startTime = Date.now();

    const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];
    const roles = [
      "Frontend & UI Specialist",
      "Backend & Logic Specialist",
      "QA & Integration Specialist",
      "Database Architect",
      "DevOps Specialist",
    ];

    this.workers = Array.from({ length: workerCount }, (_, i) => ({
      id: i + 1,
      name: `Worker ${i + 1}`,
      role: roles[i] || `Developer ${i + 1}`,
      status: "idle",
      currentTaskId: null,
      color: colors[i % colors.length],
      completedTasksCount: 0,
    }));

    this.addLog(`⚡ Initialized Nonny Swarm team with ${workerCount} workers for goal: "${goal}"`);
    this.addMessage("System", "All", `Mission initialized: "${goal}"`, null, "system");
    this.emitStateChange();
  }

  setTasks(tasks, summary = "") {
    this.tasks = tasks.map((t, index) => ({
      ...t,
      status: index === 0 ? "todo" : "todo",
      reviewNotes: "",
      workerOutput: "",
      attempts: 0,
    }));
    this.projectSummary = summary;
    this.status = "RUNNING";
    this.addLog(`📋 Manager broke down goal into ${this.tasks.length} tasks.`);
    this.addMessage("Manager", "Team", `Team, I have structured our plan into ${this.tasks.length} tickets. Let's begin!`, null, "instruction");
    this.emitStateChange();
  }

  updateTaskStatus(taskId, status, extra = {}) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      Object.assign(task, extra);
      this.emit("task_updated", task);
      this.emitStateChange();
    }
  }

  updateWorkerStatus(workerId, status, currentTaskId = null) {
    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.status = status;
      worker.currentTaskId = currentTaskId;
      if (status === "done" && currentTaskId) {
        worker.completedTasksCount = (worker.completedTasksCount || 0) + 1;
      }
      this.emit("worker_updated", worker);
      this.emitStateChange();
    }
  }

  addMessage(from, to, text, taskId = null, type = "instruction") {
    const msg = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      from,
      to,
      text,
      taskId,
      timestamp: new Date().toLocaleTimeString(),
      type,
    };
    this.messages.push(msg);
    if (this.messages.length > 500) this.messages.shift();
    this.emit("chat_message", msg);
    return msg;
  }

  addLog(logText) {
    const entry = `[${new Date().toLocaleTimeString()}] ${logText}`;
    this.logs.push(entry);
    if (this.logs.length > 300) this.logs.shift();
    this.emit("log_added", entry);
  }

  getSnapshot() {
    const completed = this.tasks.filter((t) => t.status === "done").length;
    const progress = this.tasks.length > 0 ? Math.round((completed / this.tasks.length) * 100) : 0;

    return {
      status: this.status,
      projectGoal: this.projectGoal,
      projectSummary: this.projectSummary,
      projectPath: this.projectPath,
      startTime: this.startTime,
      endTime: this.endTime,
      progress,
      tasks: this.tasks,
      workers: this.workers,
      messages: this.messages.slice(-100),
      logs: this.logs.slice(-60),
    };
  }

  emitStateChange() {
    this.emit("state_changed", this.getSnapshot());
  }

  completeMission() {
    this.status = "COMPLETED";
    this.endTime = Date.now();
    this.workers.forEach((w) => {
      w.status = "done";
      w.currentTaskId = null;
    });
    this.addLog("🎉 All tasks have been completed successfully!");
    this.addMessage("Manager", "All", "Great job team! The project goal has been fully completed.", null, "system");
    this.emitStateChange();
  }
}

// Singleton state
const swarmState = new SwarmState();
module.exports = swarmState;
