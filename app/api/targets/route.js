import { requireAuth } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';
import { jsonResponse, parseBody, normalizeError } from '@/lib/api-helpers';
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
    const targets = await prisma.target.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Mask credentials for security
    const maskedTargets = targets.map((target) => ({
      ...target,
      credentials: '******',
    }));

    return jsonResponse({
      ok: true,
      targets: maskedTargets,
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

export async function POST(request) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const body = await parseBody(request);
    const { name, type, credentials, isActive, frequency } = body;

    // Validate input
    if (!name || !type || !credentials) {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing required fields: name, type, credentials',
        },
        { status: 400 }
      );
    }

    // Validate credentials format (should be JSON object or string)
    let credentialsObj;
    try {
      credentialsObj =
        typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: 'Invalid credentials format (must be valid JSON)',
        },
        { status: 400 }
      );
    }

    // Encrypt credentials
    const encryptedCredentials = await encrypt(JSON.stringify(credentialsObj));

    // Create target
    const target = await prisma.target.create({
      data: {
        name,
        type,
        credentials: encryptedCredentials,
        isActive: isActive !== undefined ? isActive : true,
        frequency: frequency || 'daily',
      },
    });

    return jsonResponse(
      {
        ok: true,
        target: {
          ...target,
          credentials: '******',
        },
      },
      { status: 201 }
    );
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
