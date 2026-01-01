import { getRedis } from "./redis";
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

// Decode msgpack-like data from Redis (ARQ stores data in msgpack format)
function decodeJobData(data: string): RawJobData | null {
  try {
    // ARQ stores job data as JSON in result keys
    return JSON.parse(data);
  } catch {
    // If not JSON, try to parse as msgpack (would need msgpack library)
    // For now, return null and handle gracefully
    return null;
  }
}

// Get all queue names from Redis
export async function getQueues(): Promise<string[]> {
  const redis = getRedis();
  const keys = await redis.keys("arq:queue:*");

  // Extract queue names from keys
  const queues = keys.map((key) => key.replace("arq:queue:", ""));

  // Also check for the default queue
  const defaultExists = await redis.exists(DEFAULT_QUEUE);
  if (defaultExists && !queues.includes("default")) {
    queues.unshift("default");
  }

  return queues.length > 0 ? queues : ["default"];
}

// Get queued jobs from a specific queue
export async function getQueuedJobs(queue?: string): Promise<Job[]> {
  const redis = getRedis();
  const jobs: Job[] = [];

  const queues = queue ? [queue] : await getQueues();

  for (const q of queues) {
    const queueKey = q === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(q);
    // ARQ queues are sorted sets with score = timestamp
    const jobIds = await redis.zrange(queueKey, 0, -1);

    for (const jobId of jobIds) {
      const jobData = await redis.get(KEYS.JOB(jobId));
      if (jobData) {
        const raw = decodeJobData(jobData);
        if (raw) {
          raw.id = jobId;
          raw.queue = q;
          jobs.push(parseJob(raw, "queued"));
        }
      }
    }
  }

  return jobs;
}

// Get jobs currently being processed
export async function getInProgressJobs(): Promise<Job[]> {
  const redis = getRedis();
  const jobs: Job[] = [];

  // arq:in-progress is a hash with job_id -> worker_id
  const inProgress = await redis.hgetall(KEYS.IN_PROGRESS);

  for (const jobId of Object.keys(inProgress)) {
    const jobData = await redis.get(KEYS.JOB(jobId));
    if (jobData) {
      const raw = decodeJobData(jobData);
      if (raw) {
        raw.id = jobId;
        jobs.push(parseJob(raw, "in-progress"));
      }
    }
  }

  return jobs;
}

// Get job result (completed or failed)
export async function getJobResult(jobId: string): Promise<Job | null> {
  const redis = getRedis();
  const resultData = await redis.get(KEYS.RESULT(jobId));

  if (!resultData) return null;

  const raw = decodeJobData(resultData);
  if (!raw) return null;

  raw.id = jobId;
  const status: JobStatus = raw.success === false ? "failed" : "complete";

  return parseJob(raw, status);
}

// Get detailed job information
export async function getJobDetails(jobId: string): Promise<Job | null> {
  const redis = getRedis();

  // First check if job is in progress
  const inProgressWorker = await redis.hget(KEYS.IN_PROGRESS, jobId);
  if (inProgressWorker) {
    const jobData = await redis.get(KEYS.JOB(jobId));
    if (jobData) {
      const raw = decodeJobData(jobData);
      if (raw) {
        raw.id = jobId;
        return parseJob(raw, "in-progress");
      }
    }
  }

  // Check for result (completed/failed)
  const result = await getJobResult(jobId);
  if (result) return result;

  // Check if queued (scan all queues)
  const queues = await getQueues();
  for (const queue of queues) {
    const queueKey = queue === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(queue);
    const score = await redis.zscore(queueKey, jobId);
    if (score !== null) {
      const jobData = await redis.get(KEYS.JOB(jobId));
      if (jobData) {
        const raw = decodeJobData(jobData);
        if (raw) {
          raw.id = jobId;
          raw.queue = queue;
          return parseJob(raw, "queued");
        }
      }
    }
  }

  return null;
}

// Get completed jobs by scanning result keys
export async function getCompletedJobs(limit = 100): Promise<Job[]> {
  const redis = getRedis();
  const jobs: Job[] = [];

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

  return jobs;
}

// Get dashboard statistics
export async function getStats(): Promise<DashboardStats> {
  const redis = getRedis();

  const queues = await getQueues();
  const queueStats: QueueStats[] = [];

  let totalQueued = 0;
  let totalCompleted = 0;
  let totalFailed = 0;

  for (const queue of queues) {
    const queueKey = queue === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(queue);
    const depth = await redis.zcard(queueKey);
    totalQueued += depth;

    queueStats.push({
      name: queue,
      depth,
      processing: 0, // Will be updated below
      completed: 0,
      failed: 0,
    });
  }

  // Count in-progress jobs
  const inProgressCount = await redis.hlen(KEYS.IN_PROGRESS);

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
      const data = await redis.get(key);
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
      hour: totalLastHour > 0 ? (completedLastHour / totalLastHour) * 100 : 100,
      day: totalLastDay > 0 ? (completedLastDay / totalLastDay) * 100 : 100,
    },
    queues: queueStats,
    lastUpdated: new Date(),
  };
}

// Get paginated job list with filters
export async function getJobs(
  filters: JobFilters = {},
  sort: JobSort = { field: "enqueuedAt", direction: "desc" },
  page = 1,
  pageSize = 50
): Promise<JobListResponse> {
  let allJobs: Job[] = [];

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
      const data = await redis.get(key);

      if (data) {
        try {
          const healthCheck = JSON.parse(data);
          const lastHeartbeat = new Date(healthCheck.timestamp * 1000);
          const isStale = Date.now() - lastHeartbeat.getTime() > 60000; // 60 seconds

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
        } catch {
          // Skip invalid health check data
        }
      }
    }
  } while (cursor !== "0");

  return workers;
}
