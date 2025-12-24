/**
 * Background Worker for AI Queue
 * Processes AI generation jobs at a controlled rate
 */

const queueManager = require("./queue-manager");
const { generateCVContent } = require("./ai-service");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

class AIWorker {
  constructor() {
    this.isProcessing = false;
    this.interval = null;
    this.PROCESSING_INTERVAL = 60000; // 1 minute (Groq has generous limits)
  }

  /**
   * Start the worker
   */
  start() {
    if (this.interval) {
      console.log("[AI Worker] Already running");
      return;
    }

    console.log(
      `[AI Worker] Started with Groq - Processing interval: ${
        this.PROCESSING_INTERVAL / 1000
      }s`
    );

    // Process immediately on start (no delay needed with Groq)
    this.processNext();

    // Then process every interval
    this.interval = setInterval(() => {
      this.processNext();
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Stop the worker
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("[AI Worker] Stopped");
    }
  }

  /**
   * Process next job in queue
   */
  async processNext() {
    if (this.isProcessing) {
      console.log("[AI Worker] Already processing a job, skipping...");
      return;
    }

    const pendingJobs = queueManager.getPendingJobs();

    if (pendingJobs.length === 0) {
      console.log("[AI Worker] No pending jobs");
      return;
    }

    const job = pendingJobs[0]; // Get first pending job
    this.isProcessing = true;

    console.log(
      `[AI Worker] Processing job ${job.id} (${pendingJobs.length} in queue)`
    );

    try {
      // Mark as processing
      queueManager.markProcessing(job.id);

      // Get submission data
      const submission = await prisma.cVSubmission.findUnique({
        where: { id: job.submissionId },
      });

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Generate AI content
      const result = await generateCVContent(submission, job.section);

      // Mark as completed
      queueManager.markCompleted(job.id, result);

      console.log(`[AI Worker] ✅ Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[AI Worker] ❌ Job ${job.id} failed:`, error.message);
      queueManager.markFailed(job.id, error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Export singleton instance
module.exports = new AIWorker();
