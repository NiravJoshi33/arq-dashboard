import { getRedis } from "./redis";
import { Parser } from "pickleparser";
import type {
  Job,
  JobStatus,
  RawJobData,
  DashboardStats,
  QueueStats,
  JobFilters,
  JobSort,
  JobListResponse,
  Worker,
} from "$lib/types";

// Create a pickle parser instance for decoding ARQ job data
const pickleParser = new Parser();

// ARQ Redis key patterns
const KEYS = {
  QUEUE: (name: string) => `arq:queue:${name}`,
  JOB: (id: string) => `arq:job:${id}`,
  RESULT: (id: string) => `arq:result:${id}`,
  IN_PROGRESS: "arq:in-progress",
  HEALTH_CHECK: (worker: string) => `arq:health-check:${worker}`,
};

// Default queue name used by ARQ
const DEFAULT_QUEUE = "arq:queue";

// Parse raw job data from Redis into Job interface
function parseJob(raw: RawJobData, status: JobStatus): Job {
  const enqueuedAt = new Date(raw.enqueue_time * 1000);
  const startedAt = raw.start_time
    ? new Date(raw.start_time * 1000)
    : undefined;
  const completedAt = raw.finish_time
    ? new Date(raw.finish_time * 1000)
    : undefined;

  let duration: number | undefined;
  if (startedAt && completedAt) {
    duration = completedAt.getTime() - startedAt.getTime();
  } else if (startedAt && status === "in-progress") {
    duration = Date.now() - startedAt.getTime();
  }

  return {
    id: raw.id,
    function: raw.function,
    queue: raw.queue || "default",
    status,
    enqueuedAt,
    startedAt,
    completedAt,
    duration,
    args: raw.args || [],
    kwargs: raw.kwargs || {},
    result: raw.result,
    error: raw.error,
    stackTrace: raw.traceback,
    retryCount: raw.retry || 0,
    expiresAt: raw.expires ? new Date(raw.expires * 1000) : undefined,
  };
}

// Decode data from Redis - ARQ uses pickle format by default
function decodeJobData(data: string | Buffer | null): RawJobData | null {
  if (!data) return null;

  try {
    // Convert to Uint8Array for pickle decoding
    let buffer: Uint8Array;
    if (Buffer.isBuffer(data)) {
      buffer = new Uint8Array(data);
    } else if (typeof data === "string") {
      // Try JSON first (for backwards compatibility or result keys)
      try {
        return JSON.parse(data) as RawJobData;
      } catch {
        // Not JSON, convert string to buffer for pickle
        buffer = new Uint8Array(Buffer.from(data, "binary"));
      }
    } else {
      return null;
    }

    // Decode pickle data
    const decoded = pickleParser.parse<Record<string, unknown>>(buffer);

    // ARQ stores job data with specific field names, map them to our interface
    // ARQ field names: job_id, function, args, kwargs, job_try, enqueue_time, score
    const jobId =
      (decoded.job_id as string) ||
      (decoded.id as string) ||
      (decoded.j as string) ||
      "";

    return {
      id: jobId,
      function: (decoded.function || decoded.f || "") as string,
      queue: (decoded.queue || decoded.q || "default") as string,
      args: (decoded.args || decoded.a || []) as unknown[],
      kwargs: (decoded.kwargs || decoded.kw || {}) as Record<string, unknown>,
      enqueue_time: (decoded.enqueue_time ||
        decoded.et ||
        Date.now() / 1000) as number,
      start_time: (decoded.start_time || decoded.st) as number | undefined,
      finish_time: (decoded.finish_time || decoded.ft) as number | undefined,
      result: decoded.result || decoded.r,
      success: decoded.success as boolean | undefined,
      error: (decoded.error || decoded.e) as string | undefined,
      traceback: (decoded.traceback || decoded.tb) as string | undefined,
      retry: (decoded.job_try || decoded.retry || decoded.t || 0) as number,
      expires: (decoded.expires || decoded.ex) as number | undefined,
      score: decoded.score as number | undefined,
    };
  } catch (err) {
    console.error("Error decoding job data:", err);
    return null;
  }
}

// Safely get queue depth - handles different key types
async function safeGetQueueDepth(queueKey: string): Promise<number> {
  const redis = getRedis();
  try {
    const keyType = await redis.type(queueKey);
    if (keyType === "zset") {
      return await redis.zcard(queueKey);
    } else if (keyType === "list") {
      return await redis.llen(queueKey);
    } else if (keyType === "none") {
      return 0;
    }
    // Unknown type, return 0
    return 0;
  } catch (err) {
    console.error(`Error getting queue depth for ${queueKey}:`, err);
    return 0;
  }
}

// Get raw job data from queue as buffers (ARQ stores msgpack data directly in sorted set)
async function safeGetQueueJobsRaw(queueKey: string): Promise<Buffer[]> {
  const redis = getRedis();
  try {
    const keyType = await redis.type(queueKey);
    if (keyType === "zset") {
      // Use zrangeBuffer to get raw binary data
      return await redis.zrangeBuffer(queueKey, 0, -1);
    } else if (keyType === "list") {
      // Use lrangeBuffer for lists
      return await redis.lrangeBuffer(queueKey, 0, -1);
    } else if (keyType === "none") {
      return [];
    }
    return [];
  } catch (err) {
    console.error(`Error getting jobs from ${queueKey}:`, err);
    return [];
  }
}

// Safely get hash data - handles wrong type errors
async function safeHgetall(key: string): Promise<Record<string, string>> {
  const redis = getRedis();
  try {
    const keyType = await redis.type(key);
    if (keyType === "hash") {
      return await redis.hgetall(key);
    }
    return {};
  } catch (err) {
    console.error(`Error getting hash data from ${key}:`, err);
    return {};
  }
}

// Safely get hash length
async function safeHlen(key: string): Promise<number> {
  const redis = getRedis();
  try {
    const keyType = await redis.type(key);
    if (keyType === "hash") {
      return await redis.hlen(key);
    }
    return 0;
  } catch (err) {
    console.error(`Error getting hash length from ${key}:`, err);
    return 0;
  }
}

// Get all queue names from Redis
export async function getQueues(): Promise<string[]> {
  const redis = getRedis();
  try {
    const keys = await redis.keys("arq:queue:*");

    // Extract queue names from keys
    const queues = keys.map((key) => key.replace("arq:queue:", ""));

    // Also check for the default queue
    const defaultExists = await redis.exists(DEFAULT_QUEUE);
    if (defaultExists && !queues.includes("default")) {
      queues.unshift("default");
    }

    return queues.length > 0 ? queues : ["default"];
  } catch (err) {
    console.error("Error getting queues:", err);
    return ["default"];
  }
}

// Get queued jobs from a specific queue
export async function getQueuedJobs(queue?: string): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    const queues = queue ? [queue] : await getQueues();

    for (const q of queues) {
      const queueKey = q === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(q);
      // Get raw job data directly from queue (ARQ stores msgpack data as sorted set members)
      const jobDataList = await safeGetQueueJobsRaw(queueKey);

      for (const jobData of jobDataList) {
        try {
          const raw = decodeJobData(jobData);
          if (raw) {
            // Generate job ID from function name and enqueue time if not present
            raw.id = raw.id || `${raw.function}-${raw.enqueue_time}`;
            raw.queue = q;
            jobs.push(parseJob(raw, "queued"));
          }
        } catch (err) {
          console.error(`Error decoding job from queue ${q}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("Error getting queued jobs:", err);
  }

  return jobs;
}

// Get jobs currently being processed
export async function getInProgressJobs(): Promise<Job[]> {
  const redis = getRedis();
  const jobs: Job[] = [];

  try {
    const inProgress = await safeHgetall(KEYS.IN_PROGRESS);

    for (const jobId of Object.keys(inProgress)) {
      try {
        // Use getBuffer for binary msgpack data
        const jobData = await redis.getBuffer(KEYS.JOB(jobId));
        if (jobData) {
          const raw = decodeJobData(jobData);
          if (raw) {
            raw.id = jobId;
            jobs.push(parseJob(raw, "in-progress"));
          }
        }
      } catch (err) {
        console.error(`Error getting in-progress job ${jobId}:`, err);
      }
    }
  } catch (err) {
    console.error("Error getting in-progress jobs:", err);
  }

  return jobs;
}

// Get job result (completed or failed)
export async function getJobResult(jobId: string): Promise<Job | null> {
  const redis = getRedis();

  try {
    // Use getBuffer for binary msgpack data
    const resultData = await redis.getBuffer(KEYS.RESULT(jobId));

    if (!resultData) return null;

    const raw = decodeJobData(resultData);
    if (!raw) return null;

    raw.id = jobId;
    const status: JobStatus = raw.success === false ? "failed" : "complete";

    return parseJob(raw, status);
  } catch (err) {
    console.error(`Error getting job result for ${jobId}:`, err);
    return null;
  }
}

// Get detailed job information
export async function getJobDetails(jobId: string): Promise<Job | null> {
  try {
    // Check for result (completed/failed) first - most common case
    const result = await getJobResult(jobId);
    if (result) return result;

    // Search in queued jobs
    const queuedJobs = await getQueuedJobs();
    const queuedJob = queuedJobs.find((j) => j.id === jobId);
    if (queuedJob) return queuedJob;

    // Search in in-progress jobs
    const inProgressJobs = await getInProgressJobs();
    const inProgressJob = inProgressJobs.find((j) => j.id === jobId);
    if (inProgressJob) return inProgressJob;
  } catch (err) {
    console.error(`Error getting job details for ${jobId}:`, err);
  }

  return null;
}

// Get completed jobs by scanning result keys
export async function getCompletedJobs(limit = 100): Promise<Job[]> {
  const redis = getRedis();
  const jobs: Job[] = [];

  try {
    // Scan for result keys
    let cursor = "0";
    const resultKeys: string[] = [];

    do {
      const [newCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "arq:result:*",
        "COUNT",
        100
      );
      cursor = newCursor;
      resultKeys.push(...keys);

      if (resultKeys.length >= limit) break;
    } while (cursor !== "0");

    // Get job data for each result
    for (const key of resultKeys.slice(0, limit)) {
      const jobId = key.replace("arq:result:", "");
      const job = await getJobResult(jobId);
      if (job) {
        jobs.push(job);
      }
    }
  } catch (err) {
    console.error("Error getting completed jobs:", err);
  }

  return jobs;
}

// Get dashboard statistics
export async function getStats(): Promise<DashboardStats> {
  const redis = getRedis();

  const queueStats: QueueStats[] = [];
  let totalQueued = 0;
  let totalCompleted = 0;
  let totalFailed = 0;

  try {
    const queues = await getQueues();

    for (const queue of queues) {
      const queueKey = queue === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(queue);
      const depth = await safeGetQueueDepth(queueKey);
      totalQueued += depth;

      queueStats.push({
        name: queue,
        depth,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    }

    // Count in-progress jobs
    const inProgressCount = await safeHlen(KEYS.IN_PROGRESS);

    // Count completed/failed by scanning results
    let cursor = "0";
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let completedLastHour = 0;
    let failedLastHour = 0;
    let completedLastDay = 0;
    let failedLastDay = 0;

    do {
      const [newCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "arq:result:*",
        "COUNT",
        100
      );
      cursor = newCursor;

      for (const key of keys) {
        try {
          // Use getBuffer for binary msgpack data
          const data = await redis.getBuffer(key);
          if (data) {
            const raw = decodeJobData(data);
            if (raw) {
              const finishTime = raw.finish_time ? raw.finish_time * 1000 : 0;
              const isFailed = raw.success === false;

              if (isFailed) {
                totalFailed++;
                if (finishTime > hourAgo) failedLastHour++;
                if (finishTime > dayAgo) failedLastDay++;
              } else {
                totalCompleted++;
                if (finishTime > hourAgo) completedLastHour++;
                if (finishTime > dayAgo) completedLastDay++;
              }
            }
          }
        } catch (err) {
          console.error(`Error processing result key ${key}:`, err);
        }
      }
    } while (cursor !== "0");

    const totalLastHour = completedLastHour + failedLastHour;
    const totalLastDay = completedLastDay + failedLastDay;

    return {
      queued: totalQueued,
      inProgress: inProgressCount,
      complete: totalCompleted,
      failed: totalFailed,
      total: totalQueued + inProgressCount + totalCompleted + totalFailed,
      successRate: {
        hour:
          totalLastHour > 0 ? (completedLastHour / totalLastHour) * 100 : 100,
        day: totalLastDay > 0 ? (completedLastDay / totalLastDay) * 100 : 100,
      },
      queues: queueStats,
      lastUpdated: new Date(),
    };
  } catch (err) {
    console.error("Error getting stats:", err);
    return {
      queued: 0,
      inProgress: 0,
      complete: 0,
      failed: 0,
      total: 0,
      successRate: { hour: 100, day: 100 },
      queues: [],
      lastUpdated: new Date(),
    };
  }
}

// Get paginated job list with filters
export async function getJobs(
  filters: JobFilters = {},
  sort: JobSort = { field: "enqueuedAt", direction: "desc" },
  page = 1,
  pageSize = 50
): Promise<JobListResponse> {
  let allJobs: Job[] = [];

  try {
    // Collect jobs based on status filter
    const statuses = filters.status
      ? Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      : ["queued", "in-progress", "complete", "failed"];

    if (statuses.includes("queued")) {
      const queued = await getQueuedJobs(filters.queue);
      allJobs.push(...queued);
    }

    if (statuses.includes("in-progress")) {
      const inProgress = await getInProgressJobs();
      allJobs.push(...inProgress);
    }

    if (statuses.includes("complete") || statuses.includes("failed")) {
      const completed = await getCompletedJobs(1000);
      allJobs.push(
        ...completed.filter((j) => {
          if (statuses.includes("complete") && j.status === "complete")
            return true;
          if (statuses.includes("failed") && j.status === "failed") return true;
          return false;
        })
      );
    }

    // Apply filters
    if (filters.queue) {
      allJobs = allJobs.filter((j) => j.queue === filters.queue);
    }

    if (filters.function) {
      allJobs = allJobs.filter((j) =>
        j.function.toLowerCase().includes(filters.function!.toLowerCase())
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      allJobs = allJobs.filter(
        (j) =>
          j.id.toLowerCase().includes(searchLower) ||
          j.function.toLowerCase().includes(searchLower)
      );
    }

    if (filters.startDate) {
      allJobs = allJobs.filter((j) => j.enqueuedAt >= filters.startDate!);
    }

    if (filters.endDate) {
      allJobs = allJobs.filter((j) => j.enqueuedAt <= filters.endDate!);
    }

    // Sort jobs
    allJobs.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return sort.direction === "asc" ? 1 : -1;
      if (bVal === undefined) return sort.direction === "asc" ? -1 : 1;

      if (aVal instanceof Date && bVal instanceof Date) {
        return sort.direction === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  } catch (err) {
    console.error("Error getting jobs:", err);
  }

  // Paginate
  const total = allJobs.length;
  const start = (page - 1) * pageSize;
  const jobs = allJobs.slice(start, start + pageSize);

  return {
    jobs,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

// Get worker information
export async function getWorkers(): Promise<Worker[]> {
  const redis = getRedis();
  const workers: Worker[] = [];

  try {
    // Scan for health check keys
    let cursor = "0";
    do {
      const [newCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "arq:health-check:*",
        "COUNT",
        100
      );
      cursor = newCursor;

      for (const key of keys) {
        const workerId = key.replace("arq:health-check:", "");
        try {
          const data = await redis.get(key);

          if (data) {
            const healthCheck = JSON.parse(
              Buffer.isBuffer(data) ? data.toString("utf-8") : data
            );
            const lastHeartbeat = new Date(healthCheck.timestamp * 1000);
            const isStale = Date.now() - lastHeartbeat.getTime() > 60000;

            workers.push({
              id: workerId,
              hostname: healthCheck.hostname || workerId.split(":")[0],
              pid: healthCheck.pid || 0,
              queues: healthCheck.queues || ["default"],
              currentJob: healthCheck.current_job,
              lastHeartbeat,
              startedAt: new Date(healthCheck.start_time * 1000),
              jobsProcessed: healthCheck.jobs_processed || 0,
              isStale,
            });
          }
        } catch (err) {
          console.error(`Error processing worker ${workerId}:`, err);
        }
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("Error getting workers:", err);
  }

  return workers;
}
