import { requireAuth } from '@/lib/auth';
import { jsonResponse, normalizeError } from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

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
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const targetId = url.searchParams.get('targetId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (targetId) {
      where.targetId = targetId;
    }

    // Get paginated run items with related data
    const [items, total] = await Promise.all([
      prisma.runItem.findMany({
        where,
        include: {
          run: true,
          target: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.runItem.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return jsonResponse({
      ok: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
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
