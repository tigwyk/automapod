/**
 * Shared Redis connection options for BullMQ.
 *
 * Uses new URL() to correctly handle authenticated Redis URLs
 * (e.g. redis://:password@host:6379 or rediss://user:pass@host:6380).
 */
export function createRedisOptions() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);

  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
