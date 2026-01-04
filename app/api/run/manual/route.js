import { requireAuth } from '@/lib/auth';
import { jsonResponse, normalizeError, getIntEnv } from '@/lib/api-helpers';
import { decrypt } from '@/lib/encryption';
import { executeTargets } from '@/lib/keepalive';
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
    const timeoutMs = getIntEnv('RUN_TIMEOUT_MS', 8000);
    const concurrency = getIntEnv('RUN_CONCURRENCY', 5);

    // Get all active targets
    const targets = await prisma.target.findMany({
      where: { isActive: true },
    });

    if (targets.length === 0) {
      return jsonResponse({
        ok: true,
        message: 'No active targets to run',
        results: [],
      });
    }

    // Create Run record
    const run = await prisma.run.create({
      data: {
        triggerType: 'manual',
        status: 'running',
      },
    });

    // Decrypt credentials for each target
    const decryptedTargets = await Promise.all(
      targets.map(async (target) => ({
        ...target,
        credentials: await decrypt(target.credentials),
      }))
    );

    // Execute targets
    const results = await executeTargets(decryptedTargets, concurrency, timeoutMs);

    // Save results to database
    await Promise.all(
      results.map((result) =>
        prisma.runItem.create({
          data: {
            runId: run.id,
            targetId: result.targetId,
            status: result.ok ? 'success' : 'failure',
            durationMs: result.ms || 0,
            errorMessage: result.error || null,
          },
        })
      )
    );

    // Update run status
    const allSuccess = results.every((r) => r.ok);
    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: allSuccess ? 'completed' : 'failed',
        finishedAt: new Date(),
      },
    });

    return jsonResponse({
      ok: true,
      runId: run.id,
      totalTargets: results.length,
      successCount: results.filter((r) => r.ok).length,
      failureCount: results.filter((r) => !r.ok).length,
      results: results.map((r) => ({
        targetId: r.targetId,
        name: r.name,
        ok: r.ok,
        ms: r.ms,
        error: r.error,
      })),
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
