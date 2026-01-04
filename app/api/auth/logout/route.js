import { clearSession } from '@/lib/auth';
import { jsonResponse, normalizeError } from '@/lib/api-helpers';

export const runtime = 'edge';

export async function POST(request) {
  try {
    await clearSession();

    return jsonResponse({
      ok: true,
      message: 'Logout successful',
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
