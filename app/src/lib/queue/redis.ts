/**
 * Shared Redis connection options for BullMQ.
 *
 * Uses new URL() to correctly handle authenticated Redis URLs
 * (e.g. redis://:password@host:6379 or rediss://user:pass@host:6380).
 */
export function createRedisOptions() {
  const rawRedisUrl = process.env.REDIS_URL;
  let redisUrl = rawRedisUrl && rawRedisUrl.trim() !== '' ? rawRedisUrl.trim() : 'redis://localhost:6379';

  // Allow host:port style values by defaulting to the redis:// scheme when missing.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(redisUrl)) {
    redisUrl = `redis://${redisUrl}`;
  }

  let url: URL;
  try {
    url = new URL(redisUrl);
  } catch (err) {
    const originalMessage = (err as Error).message;
    // Avoid including the raw URL in the error to prevent leaking credentials.
    const hasValue = rawRedisUrl != null && rawRedisUrl.trim() !== '';
    throw new Error(
      `Invalid REDIS_URL value (${hasValue ? 'value provided but could not be parsed' : 'empty or unset'}). ` +
      'Expected an absolute URL such as "redis://host:6379" or "rediss://user:pass@host:6380". ' +
      `Original error: ${originalMessage}`,
    );
  }

  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
