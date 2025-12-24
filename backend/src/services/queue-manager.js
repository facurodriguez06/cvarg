/**
 * Queue Manager for AI requests
 * Handles in-memory queue storage and job management
 */

const { v4: uuidv4 } = require("uuid");

class QueueManager {
  constructor() {
    this.queue = [];
  }

  /**
   * Add a new AI generation job to the queue
   */
  enqueue(submissionId, section = "all") {
    const job = {
      id: uuidv4(),
      submissionId,
      section,
      status: "pending", // pending, processing, completed, failed
      result: null,
      error: null,
      createdAt: new Date(),
      processedAt: null,
    };

    this.queue.push(job);
    console.log(
      `[Queue] Job enqueued: ${job.id} for submission ${submissionId}`
    );
    return job;
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    return this.queue.find((job) => job.id === jobId);
  }

  /**
   * Get all jobs in queue
   */
  getAllJobs() {
    return this.queue;
  }

  /**
   * Get pending jobs
   */
  getPendingJobs() {
    return this.queue.filter((job) => job.status === "pending");
  }

  /**
   * Get position of a job in the pending queue
   */
  getQueuePosition(jobId) {
    const pendingJobs = this.getPendingJobs();
    const index = pendingJobs.findIndex((job) => job.id === jobId);
    return index >= 0 ? index + 1 : null;
  }

  /**
   * Update job status
   */
  updateJob(jobId, updates) {
    const job = this.getJob(jobId);
    if (job) {
      Object.assign(job, updates);
      console.log(`[Queue] Job updated: ${jobId} - Status: ${job.status}`);
    }
    return job;
  }

  /**
   * Mark job as processing
   */
  markProcessing(jobId) {
    return this.updateJob(jobId, {
      status: "processing",
      processedAt: new Date(),
    });
  }

  /**
   * Mark job as completed
   */
  markCompleted(jobId, result) {
    return this.updateJob(jobId, {
      status: "completed",
      result,
      processedAt: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  markFailed(jobId, error) {
    return this.updateJob(jobId, {
      status: "failed",
      error: error.message || error,
      processedAt: new Date(),
    });
  }

  /**
   * Clean old completed/failed jobs (optional, to prevent memory leak)
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours default
    const now = Date.now();
    const before = this.queue.length;

    this.queue = this.queue.filter((job) => {
      if (job.status === "pending" || job.status === "processing") {
        return true; // Keep pending/processing jobs
      }

      const age = now - new Date(job.processedAt).getTime();
      return age < maxAge; // Remove old completed/failed jobs
    });

    const removed = before - this.queue.length;
    if (removed > 0) {
      console.log(`[Queue] Cleaned up ${removed} old jobs`);
    }
  }
}

// Export singleton instance
module.exports = new QueueManager();
