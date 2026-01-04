import { requireAuth } from '@/lib/auth';
import { jsonResponse, normalizeError } from '@/lib/api-helpers';
import { decrypt } from '@/lib/encryption';
import { generateKeepaliveTargets } from '@/lib/generator';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function POST(request) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const secret = process.env.KEEPALIVE_SECRET;

    if (!secret) {
      return jsonResponse(
        {
          ok: false,
          error: 'KEEPALIVE_SECRET environment variable is not set',
        },
        { status: 500 }
      );
    }

    // Get all active targets
    const targets = await prisma.target.findMany({
      where: { isActive: true },
    });

    if (targets.length === 0) {
      return jsonResponse({
        ok: true,
        envVar: 'KEEPALIVE_TARGETS=""',
        message: 'No active targets',
      });
    }

    // Decrypt credentials for each target
    const decryptedTargets = await Promise.all(
      targets.map(async (target) => ({
        ...target,
        credentials: JSON.parse(await decrypt(target.credentials)),
      }))
    );

    // Generate KEEPALIVE_TARGETS
    const envVar = await generateKeepaliveTargets(decryptedTargets, secret);

    return jsonResponse({
      ok: true,
      envVar,
      targetCount: targets.length,
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
