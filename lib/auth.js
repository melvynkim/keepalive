import { compare, hash } from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'keepalive_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function hashPassword(password) {
  return await hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return await compare(password, hashedPassword);
}

export async function getSession() {
  const cookieStore = await cookies();
  return await getIronSession(cookieStore, sessionOptions);
}

export async function setSession(data) {
  const session = await getSession();
  Object.assign(session, data);
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

export async function requireAuth(request = null) {
  const session = await getSession();

  if (!session.isAuthenticated) {
    return {
      authenticated: false,
      error: 'Unauthorized',
      status: 401,
    };
  }

  // Optional: Verify IP hasn't changed (prevents session hijacking)
  // Only if request is provided and IP was stored in session
  if (request && session.ip) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const currentIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    if (currentIp !== session.ip) {
      console.warn(
        `Session IP mismatch: session=${session.ip}, request=${currentIp}. Possible session hijacking.`
      );
      // Clear the compromised session
      await clearSession();
      return {
        authenticated: false,
        error: 'Session invalid. Please login again.',
        status: 401,
      };
    }
  }

  return { authenticated: true };
}
