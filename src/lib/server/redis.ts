import Redis from "ioredis";
import type { RedisStatus } from "$lib/types";

let redis: Redis | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

export function getRedis(): Redis {
  if (!redis) {
    const url = getRedisUrl();
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected successfully");
    });

    redis.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });
  }

  return redis;
}

export async function getRedisStatus(): Promise<RedisStatus> {
  const client = getRedis();
  const url = new URL(getRedisUrl().replace("redis://", "http://"));

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    return {
      connected: true,
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      latency,
    };
  } catch (err) {
    return {
      connected: false,
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
