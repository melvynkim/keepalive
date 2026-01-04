import { jsonResponse, normalizeError, getIntEnv } from '@/lib/api-helpers';
import { decrypt } from '@/lib/encryption';
import { executeTargets } from '@/lib/keepalive';
import { getTargetsDue } from '@/lib/scheduler';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function GET(request) {
  return await handleCron(request);
}

export async function POST(request) {
  return await handleCron(request);
}

async function handleCron(request) {
  try {
    // Verify CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader !== `Bearer ${cronSecret}`) {
        return jsonResponse(
          {
            ok: false,
            error: 'Unauthorized',
          },
          { status: 401 }
        );
      }
    }

    const timeoutMs = getIntEnv('RUN_TIMEOUT_MS', 8000);
    const concurrency = getIntEnv('RUN_CONCURRENCY', 5);

    // Get all active targets
    const allTargets = await prisma.target.findMany({
      where: { isActive: true },
    });

    if (allTargets.length === 0) {
      return jsonResponse({
        ok: true,
        message: 'No active targets',
        results: [],
      });
    }

    // Get last run history for each target
    const runHistory = await prisma.runItem.findMany({
      orderBy: { createdAt: 'desc' },
      distinct: ['targetId'],
    });

    // Filter targets that are due
    const targetsDue = getTargetsDue(allTargets, runHistory);

    if (targetsDue.length === 0) {
      return jsonResponse({
        ok: true,
        message: 'No targets due for execution',
        totalTargets: allTargets.length,
        targetsDue: 0,
      });
    }

    // Create Run record
    const run = await prisma.run.create({
      data: {
        triggerType: 'cron',
        status: 'running',
      },
    });

    // Decrypt credentials for each target
    const decryptedTargets = await Promise.all(
      targetsDue.map(async (target) => ({
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
      totalTargets: allTargets.length,
      targetsDue: targetsDue.length,
      successCount: results.filter((r) => r.ok).length,
      failureCount: results.filter((r) => !r.ok).length,
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
