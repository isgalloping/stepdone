import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    globalForRedis.redis = new Redis(url, { maxRetriesPerRequest: null });
  }
  return globalForRedis.redis;
}

export function projectChannel(projectPublicId: string) {
  return `project:${projectPublicId}`;
}
