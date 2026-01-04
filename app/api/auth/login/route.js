import { setSession } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { getClientIp, jsonResponse, parseBody, normalizeError } from '@/lib/api-helpers';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    // Check rate limit
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          ok: false,
          error: rateLimit.message,
        },
        { status: 429 }
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
      return jsonResponse(
        {
          ok: false,
          error: 'Server configuration error: ADMIN_PASSWORD not set',
        },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
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
    });

    return jsonResponse({
      ok: true,
      message: 'Login successful',
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: normalizeError(error),
      },
      { status: 500 }
    );
  }
}
