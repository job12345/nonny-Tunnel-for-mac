/**
 * Nonny Swarm — Master Orchestrator Loop
 * Connects Manager Engine <-> State Store <-> Browser Workers
 * Developed by mr.j
 */
const swarmState = require("./state");
const SwarmManager = require("./manager");
const BrowserWorkerPool = require("./browser-pool");
const { PROMPTS } = require("./prompt-templates");

class SwarmOrchestrator {
  constructor() {
    this.manager = null;
    this.browserPool = null;
    this.isRunning = false;
    this.isPaused = false;
  }

  async startMission(config) {
    const {
      goal,
      projectPath = "/Users/masterjob/my-project",
      workerCount = 2,
      managerProvider = "gemini",
      managerApiKey = "",
      managerModel = "gemini-2.0-flash",
    } = config;

    this.isRunning = true;
    this.isPaused = false;

    // 1. Initialize State
    swarmState.initSwarm(goal, projectPath, workerCount);

    // 2. Initialize Manager & Browser Pool
    this.manager = new SwarmManager({
      provider: managerProvider,
      apiKey: managerApiKey,
      model: managerModel,
    });

    this.browserPool = new BrowserWorkerPool({ headless: false });
    await this.browserPool.init(workerCount);

    try {
      // 3. Step 1: Manager Planning & Task Breakdown
      swarmState.addLog("🧠 Manager is analyzing the project goal and creating Kanban tickets...");
      const plan = await this.manager.planProject(goal, workerCount, projectPath);

      if (!plan || !plan.tasks || plan.tasks.length === 0) {
        throw new Error("Manager failed to generate a valid task breakdown.");
      }

      swarmState.setTasks(plan.tasks, plan.projectSummary);

      // 4. Step 2: Main Autonomous Dispatch Loop
      await this.runLoop(projectPath);
    } catch (err) {
      console.error("[Orchestrator Error]", err);
      swarmState.status = "ERROR";
      swarmState.addLog(`❌ Error in mission: ${err.message}`);
      swarmState.addMessage("System", "All", `Mission failed: ${err.message}`, null, "system");
      swarmState.emitStateChange();
    } finally {
      this.isRunning = false;
    }
  }

  async runLoop(projectPath) {
    let contextHistory = "";

    while (this.isRunning) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Find next task that is in 'todo' status
      const nextTask = swarmState.tasks.find((t) => t.status === "todo");

      if (!nextTask) {
        // Check if any task is still in progress
        const inProgress = swarmState.tasks.some((t) => t.status === "in_progress" || t.status === "review");
        if (!inProgress) {
          // All done!
          swarmState.completeMission();
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      const workerId = nextTask.assignedToWorker || 1;
      const worker = swarmState.workers.find((w) => w.id === workerId) || swarmState.workers[0];

      // A. Dispatch Task to Worker
      swarmState.updateTaskStatus(nextTask.id, "in_progress");
      swarmState.updateWorkerStatus(worker.id, "working", nextTask.id);

      const instructionPrompt = PROMPTS.WORKER_INSTRUCTION(nextTask, projectPath, contextHistory);
      swarmState.addMessage(
        "Manager",
        worker.name,
        `Task Assigned [${nextTask.id}]: ${nextTask.title}\n\n${nextTask.description}`,
        nextTask.id,
        "instruction"
      );
      swarmState.addLog(`🚀 Manager assigned [${nextTask.id}] to ${worker.name} (${worker.role})`);

      // B. Worker Execution via Browser Pool
      const workerOutput = await this.browserPool.dispatchTaskToWorker(
        worker.id,
        instructionPrompt,
        (progressText) => {
          swarmState.addLog(`🤖 ${worker.name}: ${progressText.slice(0, 100)}...`);
        }
      );

      swarmState.addMessage(worker.name, "Manager", workerOutput, nextTask.id, "report");
      swarmState.addLog(`📬 ${worker.name} finished [${nextTask.id}] and submitted for review.`);
      swarmState.updateTaskStatus(nextTask.id, "review", { workerOutput });
      swarmState.updateWorkerStatus(worker.id, "reviewing", nextTask.id);

      // C. Manager Review & Verification
      swarmState.addLog(`🔍 Manager is reviewing work for [${nextTask.id}]...`);
      const review = await this.manager.reviewWork(nextTask, workerOutput);

      if (review.status === "APPROVED") {
        swarmState.updateTaskStatus(nextTask.id, "done", { reviewNotes: review.reviewNotes });
        swarmState.updateWorkerStatus(worker.id, "done", nextTask.id);
        swarmState.addMessage(
          "Manager",
          worker.name,
          `✅ APPROVED: ${review.feedbackForWorker || "Task verified successfully."}\n\nReview Notes: ${review.reviewNotes}`,
          nextTask.id,
          "review"
        );
        swarmState.addLog(`✅ Manager APPROVED [${nextTask.id}].`);
        contextHistory += `\n- Task ${nextTask.id} (${nextTask.title}) completed: ${review.reviewNotes}`;
      } else {
        // Rejected -> Needs rework
        nextTask.attempts = (nextTask.attempts || 0) + 1;
        swarmState.updateTaskStatus(nextTask.id, "todo", { reviewNotes: review.reviewNotes });
        swarmState.updateWorkerStatus(worker.id, "idle", null);
        swarmState.addMessage(
          "Manager",
          worker.name,
          `⚠️ REVISION NEEDED: ${review.feedbackForWorker}\n\nPlease fix and resubmit.`,
          nextTask.id,
          "review"
        );
        swarmState.addLog(`⚠️ Manager requested rework on [${nextTask.id}].`);
      }

      // Small delay between tasks for stability
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  async stopMission() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.browserPool) {
      await this.browserPool.close().catch(() => {});
    }
    swarmState.status = "IDLE";
    swarmState.addLog("⏹ Mission stopped by user.");
    swarmState.addMessage("System", "All", "Mission aborted by user.", null, "system");
    swarmState.emitStateChange();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    swarmState.status = this.isPaused ? "PAUSED" : "RUNNING";
    swarmState.addLog(this.isPaused ? "⏸ Mission paused." : "▶ Mission resumed.");
    swarmState.emitStateChange();
    return this.isPaused;
  }
}

// Singleton Orchestrator
const swarmOrchestrator = new SwarmOrchestrator();
module.exports = swarmOrchestrator;
