// Job status types
export type JobStatus = "queued" | "in-progress" | "complete" | "failed";

// Core job interface representing an ARQ job
export interface Job {
  id: string;
  function: string;
  queue: string;
  status: JobStatus;
  enqueuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  args: unknown[];
  kwargs: Record<string, unknown>;
  result?: unknown;
  error?: string;
  stackTrace?: string;
  retryCount: number;
  nextRetry?: Date;
  expiresAt?: Date;
}

// Raw job data from Redis (before date parsing)
export interface RawJobData {
  id: string;
  function: string;
  queue: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
  enqueue_time: number;
  start_time?: number;
  finish_time?: number;
  result?: unknown;
  success?: boolean;
  error?: string;
  traceback?: string;
  retry?: number;
  expires?: number;
  score?: number;
}

// Dashboard statistics
export interface DashboardStats {
  queued: number;
  inProgress: number;
  complete: number;
  failed: number;
  total: number;
  successRate: {
    hour: number;
    day: number;
  };
  queues: QueueStats[];
  lastUpdated: Date;
}

// Per-queue statistics
export interface QueueStats {
  name: string;
  depth: number;
  processing: number;
  completed: number;
  failed: number;
  avgDuration?: number;
}

// Worker information
export interface Worker {
  id: string;
  hostname: string;
  pid: number;
  queues: string[];
  currentJob?: string;
  lastHeartbeat: Date;
  startedAt: Date;
  jobsProcessed: number;
  isStale: boolean;
}

// Job list response with pagination
export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter options for job list
export interface JobFilters {
  status?: JobStatus | JobStatus[];
  queue?: string;
  function?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// Sort options for job list
export interface JobSort {
  field: keyof Pick<
    Job,
    "id" | "function" | "queue" | "status" | "enqueuedAt" | "duration"
  >;
  direction: "asc" | "desc";
}

// SSE event types
export type SSEEventType =
  | "stats-update"
  | "job-update"
  | "worker-update"
  | "connection";

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
  timestamp: Date;
}

// Redis connection status
export interface RedisStatus {
  connected: boolean;
  host: string;
  port: number;
  latency?: number;
  error?: string;
}

// Time range for filtering
export type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";

// Chart data point
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

// Queue depth history
export interface QueueDepthHistory {
  queue: string;
  history: ChartDataPoint[];
}
