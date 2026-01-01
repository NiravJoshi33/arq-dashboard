import { getRedis } from "./redis";
import { Parser } from "pickleparser";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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

const pickleParser = new Parser();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

// ARQ Redis key patterns
const KEYS = {
	QUEUE: (name: string) => `arq:queue:${name}`,
	JOB: (id: string) => `arq:job:${id}`,
	RESULT: (id: string) => `arq:result:${id}`,
	IN_PROGRESS: "arq:in-progress",
	HEALTH_CHECK: (worker: string) => `arq:health-check:${worker}`,
};

const DEFAULT_QUEUE = "arq:queue";

// Fallback to Python for unpickling when JS parser fails
async function unpickleWithPython(buffer: Buffer): Promise<Record<string, unknown> | null> {
	return new Promise((resolve) => {
		const pythonScript = join(projectRoot, "scripts/unpickle.py");
		const python = spawn("python3", [pythonScript]);

		let stdout = "";
		let stderr = "";

		python.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		python.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		python.on("close", (code) => {
			if (code === 0 && stdout) {
				try {
					resolve(JSON.parse(stdout));
				} catch {
					resolve(null);
				}
			} else {
				if (stderr) {
					console.error("Python unpickle error:", stderr);
				}
				resolve(null);
			}
		});

		python.stdin.write(buffer);
		python.stdin.end();
	});
}
function parseJob(raw: RawJobData, status: JobStatus): Job {
	const enqueuedAt = new Date(raw.enqueue_time * 1000);
	const startedAt = raw.start_time ? new Date(raw.start_time * 1000) : undefined;
	const completedAt = raw.finish_time ? new Date(raw.finish_time * 1000) : undefined;

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

async function decodeJobData(data: string | Buffer | null): Promise<RawJobData | null> {
	if (!data) return null;

	try {
		let buffer: Buffer;
		if (Buffer.isBuffer(data)) {
			buffer = data;
		} else if (typeof data === "string") {
			try {
				return JSON.parse(data) as RawJobData;
			} catch {
				buffer = Buffer.from(data, "binary");
			}
		} else {
			return null;
		}

		try {
			const uint8Buffer = new Uint8Array(buffer);
			const decoded = pickleParser.parse<Record<string, unknown>>(uint8Buffer);
			return mapToRawJobData(decoded);
		} catch (jsErr) {
			const decoded = await unpickleWithPython(buffer);
			if (decoded) {
				return mapToRawJobData(decoded);
			}
			return null;
		}
	} catch (err) {
		console.error("Error decoding job data:", err);
		return null;
	}
}

function mapToRawJobData(decoded: Record<string, unknown>): RawJobData {
	const jobId = (decoded.id as string) || (decoded.job_id as string) || "";

	return {
		id: jobId,
		function: (decoded.f || decoded.function || "") as string,
		queue: (decoded.q || decoded.queue || "default") as string,
		args: (decoded.a || decoded.args || []) as unknown[],
		kwargs: (decoded.k || decoded.kwargs || {}) as Record<string, unknown>,
		enqueue_time: (decoded.et || decoded.enqueue_time || Date.now() / 1000) as number,
		start_time: (decoded.st || decoded.start_time) as number | undefined,
		finish_time: (decoded.ft || decoded.finish_time) as number | undefined,
		result: decoded.r || decoded.result,
		success: decoded.success as boolean | undefined,
		error: (decoded.e || decoded.error) as string | undefined,
		traceback: (decoded.tb || decoded.traceback) as string | undefined,
		retry: (decoded.t || decoded.job_try || decoded.retry || 0) as number,
		expires: (decoded.ex || decoded.expires) as number | undefined,
		score: (decoded.s || decoded.score) as number | undefined,
	};
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
		return 0;
	} catch (err) {
		console.error(`Error getting queue depth for ${queueKey}:`, err);
		return 0;
	}
}

async function safeGetQueueJobIds(queueKey: string): Promise<string[]> {
	const redis = getRedis();
	try {
		const keyType = await redis.type(queueKey);
		if (keyType === "zset") {
			return await redis.zrange(queueKey, 0, -1);
		} else if (keyType === "list") {
			return await redis.lrange(queueKey, 0, -1);
		} else if (keyType === "none") {
			return [];
		}
		return [];
	} catch (err) {
		console.error(`Error getting job IDs from ${queueKey}:`, err);
		return [];
	}
}

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
		const queues = keys.map((key) => key.replace("arq:queue:", ""));

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
	const redis = getRedis();
	const jobs: Job[] = [];

	try {
		const queues = queue ? [queue] : await getQueues();

		for (const q of queues) {
			const queueKey = q === "default" ? DEFAULT_QUEUE : KEYS.QUEUE(q);
			const jobIds = await safeGetQueueJobIds(queueKey);

			for (const jobId of jobIds) {
				try {
					const jobData = await redis.getBuffer(KEYS.JOB(jobId));
					if (jobData) {
						const raw = await decodeJobData(jobData);
						if (raw) {
							raw.id = jobId;
							raw.queue = q;
							jobs.push(parseJob(raw, "queued"));
						}
					}
				} catch (err) {
					console.error(`Error decoding job ${jobId} from queue ${q}:`, err);
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
				const jobData = await redis.getBuffer(KEYS.JOB(jobId));
				if (jobData) {
					const raw = await decodeJobData(jobData);
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
		const resultData = await redis.getBuffer(KEYS.RESULT(jobId));
		if (!resultData) return null;

		const raw = await decodeJobData(resultData);
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
			const [newCursor, keys] = await redis.scan(cursor, "MATCH", "arq:result:*", "COUNT", 100);
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

		const inProgressCount = await safeHlen(KEYS.IN_PROGRESS);
		let cursor = "0";
		const hourAgo = Date.now() - 60 * 60 * 1000;
		const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
		let completedLastHour = 0;
		let failedLastHour = 0;
		let completedLastDay = 0;
		let failedLastDay = 0;

		do {
			const [newCursor, keys] = await redis.scan(cursor, "MATCH", "arq:result:*", "COUNT", 100);
			cursor = newCursor;

			for (const key of keys) {
				try {
					const data = await redis.getBuffer(key);
					if (data) {
						const raw = await decodeJobData(data);
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
				hour: totalLastHour > 0 ? (completedLastHour / totalLastHour) * 100 : 100,
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
					if (statuses.includes("complete") && j.status === "complete") return true;
					if (statuses.includes("failed") && j.status === "failed") return true;
					return false;
				})
			);
		}

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
					j.id.toLowerCase().includes(searchLower) || j.function.toLowerCase().includes(searchLower)
			);
		}

		if (filters.startDate) {
			allJobs = allJobs.filter((j) => j.enqueuedAt >= filters.startDate!);
		}

		if (filters.endDate) {
			allJobs = allJobs.filter((j) => j.enqueuedAt <= filters.endDate!);
		}

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
				return sort.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
			}

			if (typeof aVal === "number" && typeof bVal === "number") {
				return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
			}

			return 0;
		});
	} catch (err) {
		console.error("Error getting jobs:", err);
	}

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
						const healthCheck = JSON.parse(Buffer.isBuffer(data) ? data.toString("utf-8") : data);
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
