import { getSession } from '@/lib/auth';
import { jsonResponse, normalizeError } from '@/lib/api-helpers';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const session = await getSession();

    if (!session.isAuthenticated) {
      return jsonResponse({
        ok: false,
        authenticated: false,
      });
    }

    return jsonResponse({
      ok: true,
      authenticated: true,
      loginAt: session.loginAt,
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
