/**
 * Create a JSON response
 */
export function jsonResponse(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

/**
 * Get client IP from request
 */
export function getClientIp(request) {
  // Try various headers that might contain the client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

/**
 * Parse request body as JSON
 */
export async function parseBody(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await request.json();
    }

    return {};
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Get environment variable with default
 */
export function getEnv(name, fallback = null) {
  return process.env[name] || fallback;
}

/**
 * Get integer environment variable with default
 */
export function getIntEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = parseInt(value, 10);
  return isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalize error to string
 */
export function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run promises with timeout
 */
export async function withTimeout(promise, timeoutMs, label = 'Operation') {
  const timeout = sleep(timeoutMs).then(() => {
    throw new Error(`${label} timed out after ${timeoutMs}ms`);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Map with concurrency limit
 */
export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  const executing = new Set();

  for (let i = 0; i < items.length; i++) {
    const promise = Promise.resolve()
      .then(() => mapper(items[i], i))
      .then((result) => {
        results[i] = result;
      })
      .finally(() => executing.delete(promise));

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
