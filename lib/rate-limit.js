// In-memory rate limiting for login attempts
const attempts = new Map();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of attempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function checkRateLimit(ip) {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Reset if window has passed
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, {
      count: 1,
      firstAttempt: now,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Increment count
  record.count++;

  if (record.count > MAX_ATTEMPTS) {
    const resetTime = new Date(record.firstAttempt + WINDOW_MS);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      message: `Too many login attempts. Try again after ${resetTime.toLocaleTimeString()}.`,
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
  };
}

export function resetRateLimit(ip) {
  attempts.delete(ip);
}
