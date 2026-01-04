import { NextResponse } from 'next/server';

// Rate limiting store (shared across middleware invocations)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per minute per IP

function getRateLimitKey(ip, pathname) {
  return `${ip}:${pathname}`;
}

function checkGlobalRateLimit(ip, pathname) {
  const key = getRateLimitKey(ip, pathname);
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    // New window
    requestCounts.set(key, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  record.count++;

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.windowStart + RATE_LIMIT_WINDOW),
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

  // Global rate limiting - prevent DDoS and abuse
  const rateLimit = checkGlobalRateLimit(ip, pathname);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many requests. Please slow down.',
        resetAt: rateLimit.resetAt,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Block suspicious patterns
  const suspiciousPatterns = [
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /\.php$/i,
    /\/admin$/i,
    /\/administrator/i,
    /\/config/i,
    /\/backup/i,
    /\.sql/i,
    /\.bak/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(pathname)) {
      console.warn(`Suspicious request blocked: ${pathname} from IP ${ip}`);
      return NextResponse.json(
        { ok: false, error: 'Not found' },
        { status: 404 }
      );
    }
  }

  // Add security headers to response
  const response = NextResponse.next();

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));

  // Add additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

// Configure which routes middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
