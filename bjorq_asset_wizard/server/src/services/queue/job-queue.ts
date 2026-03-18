/**
 * Generation Job Queue (v2.3.0)
 *
 * Manages concurrency limits for GPU-bound generation jobs.
 * Ensures stable multi-job processing without overloading resources.
 */

import type { FastifyBaseLogger } from "fastify";

export interface QueuedItem {
  jobId: string;
  execute: () => Promise<void>;
  queuedAt: number;
  startedAt?: number;
}

export interface QueueStatus {
  maxConcurrent: number;
  running: number;
  queued: number;
  queuedJobIds: string[];
}

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_JOBS || 1);

class GenerationQueue {
  private queue: QueuedItem[] = [];
  private running = new Map<string, QueuedItem>();
  private log: FastifyBaseLogger | null = null;

  setLogger(log: FastifyBaseLogger) {
    this.log = log;
  }

  /**
   * Enqueue a generation job. Returns position in queue (0 = running immediately).
   */
  enqueue(jobId: string, execute: () => Promise<void>): number {
    const item: QueuedItem = { jobId, execute, queuedAt: Date.now() };
    this.queue.push(item);
    this.log?.info({ jobId, queueLength: this.queue.length, running: this.running.size }, "Job enqueued");
    this.processNext();
    return Math.max(0, this.queue.length - 1);
  }

  /**
   * Get current queue status.
   */
  getStatus(): QueueStatus {
    return {
      maxConcurrent: MAX_CONCURRENT,
      running: this.running.size,
      queued: this.queue.length,
      queuedJobIds: this.queue.map((q) => q.jobId),
    };
  }

  /**
   * Get queue position for a specific job (0-based, -1 if running or not found).
   */
  getPosition(jobId: string): number {
    if (this.running.has(jobId)) return -1; // currently running
    return this.queue.findIndex((q) => q.jobId === jobId);
  }

  /**
   * Remove a job from the queue (e.g., on cancellation).
   */
  remove(jobId: string): boolean {
    const idx = this.queue.findIndex((q) => q.jobId === jobId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      this.log?.info({ jobId }, "Job removed from queue");
      return true;
    }
    return false;
  }

  private processNext() {
    while (this.running.size < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.startedAt = Date.now();
      this.running.set(item.jobId, item);

      this.log?.info(
        { jobId: item.jobId, waitTime: item.startedAt - item.queuedAt },
        "Job starting from queue",
      );

      item
        .execute()
        .catch((err) => {
          this.log?.error({ err, jobId: item.jobId }, "Queued job execution failed");
        })
        .finally(() => {
          this.running.delete(item.jobId);
          this.log?.info({ jobId: item.jobId }, "Job completed, releasing queue slot");
          this.processNext();
        });
    }
  }
}

/** Singleton generation queue */
export const generationQueue = new GenerationQueue();
