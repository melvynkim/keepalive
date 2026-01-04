import { requireAuth } from '@/lib/auth';
import { jsonResponse } from '@/lib/api-helpers';
import { getAvailableFrequencies } from '@/lib/scheduler';

export const runtime = 'edge';

export async function GET(request) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    // Return available frequencies and current defaults
    const frequencies = getAvailableFrequencies();

    return jsonResponse({
      ok: true,
      frequencies,
      defaultFrequency: 'daily',
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
