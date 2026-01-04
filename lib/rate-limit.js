// In-memory rate limiting with exponential backoff
const attempts = new Map();
const blockedIPs = new Map(); // Persistent blocklist for repeat offenders

const MAX_ATTEMPTS = 3; // 3 failed attempts before lockout
const INITIAL_LOCKOUT_MS = 60 * 1000; // 1 minute initial lockout
const MAX_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour max lockout
const CLEANUP_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const PERMANENT_BLOCK_THRESHOLD = 10; // Block IP permanently after 10 lockouts

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();

  // Clean up expired attempts
  for (const [ip, data] of attempts.entries()) {
    if (data.lockoutUntil && now > data.lockoutUntil) {
      // Lockout expired, reset attempts but track lockout count
      const lockoutCount = data.lockoutCount || 0;
      attempts.set(ip, {
        count: 0,
        lockoutCount: lockoutCount,
        firstAttempt: now,
        lockoutUntil: null,
      });
    }
  }

  // Clean up very old entries
  for (const [ip, data] of attempts.entries()) {
    if (now - data.firstAttempt > CLEANUP_INTERVAL_MS && !data.lockoutUntil) {
      attempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function checkRateLimit(ip) {
  const now = Date.now();

  // Check if IP is permanently blocked
  if (blockedIPs.has(ip)) {
    const blockInfo = blockedIPs.get(ip);
    return {
      allowed: false,
      remaining: 0,
      permanent: true,
      message: `Your IP has been permanently blocked due to repeated failed login attempts. Blocked at ${blockInfo.blockedAt.toISOString()}.`,
    };
  }

  const record = attempts.get(ip);

  // First attempt from this IP
  if (!record) {
    attempts.set(ip, {
      count: 1,
      lockoutCount: 0,
      firstAttempt: now,
      lockoutUntil: null,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Check if currently locked out
  if (record.lockoutUntil && now < record.lockoutUntil) {
    const remainingMs = record.lockoutUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    const resetTime = new Date(record.lockoutUntil);

    return {
      allowed: false,
      remaining: 0,
      lockoutUntil: resetTime,
      message: `Too many failed login attempts. Account locked for ${remainingMinutes} minute(s). Try again after ${resetTime.toLocaleTimeString()}.`,
    };
  }

  // Lockout expired, reset count
  if (record.lockoutUntil && now >= record.lockoutUntil) {
    record.count = 1;
    record.lockoutUntil = null;
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Increment attempt count
  record.count++;

  // Check if exceeded max attempts
  if (record.count > MAX_ATTEMPTS) {
    // Increment lockout count
    record.lockoutCount = (record.lockoutCount || 0) + 1;

    // Check for permanent block
    if (record.lockoutCount >= PERMANENT_BLOCK_THRESHOLD) {
      blockedIPs.set(ip, {
        blockedAt: new Date(),
        attempts: record.count,
        lockouts: record.lockoutCount,
      });
      attempts.delete(ip);

      return {
        allowed: false,
        remaining: 0,
        permanent: true,
        message: 'Your IP has been permanently blocked due to repeated failed login attempts.',
      };
    }

    // Calculate exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min, 60min (capped)
    const backoffMultiplier = Math.pow(2, record.lockoutCount - 1);
    const lockoutDuration = Math.min(
      INITIAL_LOCKOUT_MS * backoffMultiplier,
      MAX_LOCKOUT_MS
    );

    record.lockoutUntil = now + lockoutDuration;

    const lockoutMinutes = Math.ceil(lockoutDuration / 60000);
    const resetTime = new Date(record.lockoutUntil);

    return {
      allowed: false,
      remaining: 0,
      lockoutUntil: resetTime,
      lockoutCount: record.lockoutCount,
      message: `Too many failed login attempts (${record.count}). Account locked for ${lockoutMinutes} minute(s). Try again after ${resetTime.toLocaleTimeString()}.`,
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
  };
}

export function resetRateLimit(ip) {
  // Only reset if successful login
  const record = attempts.get(ip);
  if (record) {
    // Keep lockout count for tracking but reset attempts
    attempts.set(ip, {
      count: 0,
      lockoutCount: Math.max(0, (record.lockoutCount || 0) - 1), // Reduce lockout count on success
      firstAttempt: Date.now(),
      lockoutUntil: null,
    });
  }
}

export function isIPBlocked(ip) {
  return blockedIPs.has(ip);
}

export function getBlockedIPs() {
  return Array.from(blockedIPs.entries()).map(([ip, info]) => ({
    ip,
    ...info,
  }));
}

// Emergency function to unblock an IP (only accessible via direct server access)
export function unblockIP(ip) {
  blockedIPs.delete(ip);
  attempts.delete(ip);
}
