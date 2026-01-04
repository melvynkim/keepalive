import { setSession } from '@/lib/auth';
import { checkRateLimit, resetRateLimit, isIPBlocked } from '@/lib/rate-limit';
import { getClientIp, jsonResponse, parseBody, normalizeError } from '@/lib/api-helpers';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    // Check if IP is permanently blocked first
    if (isIPBlocked(clientIp)) {
      console.warn(`Blocked IP attempted login: ${clientIp}`);
      return jsonResponse(
        {
          ok: false,
          error: 'Your IP has been permanently blocked due to repeated failed login attempts.',
          blocked: true,
        },
        { status: 403 } // 403 Forbidden
      );
    }

    // Check rate limit with exponential backoff
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      console.warn(`Rate limited login attempt from IP: ${clientIp}`);

      return jsonResponse(
        {
          ok: false,
          error: rateLimit.message,
          lockoutUntil: rateLimit.lockoutUntil,
          permanent: rateLimit.permanent || false,
        },
        { status: rateLimit.permanent ? 403 : 429 }
      );
    }

    // Parse request body
    const body = await parseBody(request);
    const { password } = body;

    if (!password) {
      return jsonResponse(
        {
          ok: false,
          error: 'Password is required',
        },
        { status: 400 }
      );
    }

    // Verify password
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set');
      return jsonResponse(
        {
          ok: false,
          error: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const passwordBuffer = new TextEncoder().encode(password);
    const adminBuffer = new TextEncoder().encode(adminPassword);

    let isValid = passwordBuffer.length === adminBuffer.length;
    for (let i = 0; i < passwordBuffer.length; i++) {
      isValid = isValid && (passwordBuffer[i] === adminBuffer[i]);
    }

    if (!isValid) {
      console.warn(`Failed login attempt from IP: ${clientIp}, remaining attempts: ${rateLimit.remaining - 1}`);

      return jsonResponse(
        {
          ok: false,
          error: 'Invalid password',
          remaining: rateLimit.remaining - 1,
        },
        { status: 401 }
      );
    }

    // Password is correct - reset rate limit and set session
    resetRateLimit(clientIp);

    await setSession({
      isAuthenticated: true,
      loginAt: Date.now(),
      ip: clientIp, // Store IP for additional security
    });

    console.log(`Successful login from IP: ${clientIp}`);

    return jsonResponse({
      ok: true,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      {
        ok: false,
        error: 'An error occurred during login',
      },
      { status: 500 }
    );
  }
}
