import { withTimeout, normalizeError, mapLimit } from './api-helpers.js';

/**
 * Ping PostgreSQL endpoint via HTTP
 */
export async function pingPostgres(httpEndpoint, timeoutMs) {
  const started = Date.now();

  try {
    const response = await withTimeout(
      fetch(httpEndpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'KeepAlive-Manager/2.0',
        },
      }),
      timeoutMs,
      'PostgreSQL HTTP ping'
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      ok: true,
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeError(error),
      ms: Date.now() - started,
    };
  }
}

/**
 * Execute a single target
 */
export async function executeTarget(target, timeoutMs, retries = 1) {
  const { id, name, credentials } = target;

  const result = {
    targetId: id,
    name,
    ok: false,
    attempts: [],
  };

  // Parse credentials (should be decrypted JSON)
  let creds;
  try {
    creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
  } catch (error) {
    result.error = 'Invalid credentials format';
    return result;
  }

  // Check for HTTP endpoint
  const httpEndpoint = creds.httpEndpoint || creds.DATABASE_URL;

  if (!httpEndpoint) {
    result.error = 'No HTTP endpoint found in credentials';
    return result;
  }

  // Try pinging (with retry)
  for (let attempt = 0; attempt <= retries; attempt++) {
    const pingResult = await pingPostgres(httpEndpoint, timeoutMs);

    result.attempts.push({
      attempt: attempt + 1,
      ...pingResult,
    });

    if (pingResult.ok) {
      result.ok = true;
      result.ms = pingResult.ms;
      break;
    }

    // Wait before retry (except on last attempt)
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      result.error = pingResult.error;
      result.ms = pingResult.ms;
    }
  }

  return result;
}

/**
 * Execute multiple targets with concurrency control
 */
export async function executeTargets(targets, concurrency, timeoutMs) {
  if (!targets || targets.length === 0) {
    return [];
  }

  return await mapLimit(targets, concurrency, (target) =>
    executeTarget(target, timeoutMs)
  );
}
