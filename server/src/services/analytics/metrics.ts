/**
 * Pipeline Analytics & Metrics (v2.3.0)
 *
 * Lightweight operational metrics for the generation pipeline.
 * All data is in-memory — resets on restart.
 * Designed for diagnostics, not user-facing features.
 */

export interface PipelineMetrics {
  totalJobs: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  fallbackCount: number;
  avgConfidenceScore: number;
  avgGenerationTimeMs: number;
  avgQueueWaitTimeMs: number;
  trellisFailures: number;
  styleDriftCorrections: number;
  categoryDistribution: Record<string, number>;
  lodGenerations: number;
  sceneFixCount: number;
}

interface JobMetric {
  jobId: string;
  success: boolean;
  generationTimeMs: number;
  queueWaitTimeMs: number;
  confidenceScore: number;
  retries: number;
  fallbackUsed: boolean;
  trellisFailure: boolean;
  driftCorrected: boolean;
  category: string;
  lodGenerated: boolean;
  sceneFixes: number;
  timestamp: number;
}

const MAX_HISTORY = 500;

class MetricsCollector {
  private history: JobMetric[] = [];

  record(metric: JobMetric) {
    this.history.push(metric);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  getMetrics(): PipelineMetrics {
    const h = this.history;
    const total = h.length;

    if (total === 0) {
      return {
        totalJobs: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        fallbackCount: 0,
        avgConfidenceScore: 0,
        avgGenerationTimeMs: 0,
        avgQueueWaitTimeMs: 0,
        trellisFailures: 0,
        styleDriftCorrections: 0,
        categoryDistribution: {},
        lodGenerations: 0,
        sceneFixCount: 0,
      };
    }

    const successes = h.filter((m) => m.success);
    const catDist: Record<string, number> = {};
    for (const m of h) {
      catDist[m.category] = (catDist[m.category] || 0) + 1;
    }

    return {
      totalJobs: total,
      successCount: successes.length,
      failureCount: h.filter((m) => !m.success).length,
      retryCount: h.reduce((s, m) => s + m.retries, 0),
      fallbackCount: h.filter((m) => m.fallbackUsed).length,
      avgConfidenceScore: successes.length > 0
        ? successes.reduce((s, m) => s + m.confidenceScore, 0) / successes.length
        : 0,
      avgGenerationTimeMs: successes.length > 0
        ? successes.reduce((s, m) => s + m.generationTimeMs, 0) / successes.length
        : 0,
      avgQueueWaitTimeMs: total > 0
        ? h.reduce((s, m) => s + m.queueWaitTimeMs, 0) / total
        : 0,
      trellisFailures: h.filter((m) => m.trellisFailure).length,
      styleDriftCorrections: h.filter((m) => m.driftCorrected).length,
      categoryDistribution: catDist,
      lodGenerations: h.filter((m) => m.lodGenerated).length,
      sceneFixCount: h.reduce((s, m) => s + m.sceneFixes, 0),
    };
  }

  /**
   * Get recent job metrics for debugging.
   */
  getRecent(count = 10): JobMetric[] {
    return this.history.slice(-count);
  }
}

/** Singleton metrics collector */
export const pipelineMetrics = new MetricsCollector();
