import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import { jsonResponse, parseBody, normalizeError } from '@/lib/api-helpers';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function GET(request, { params }) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const { id } = await params;

    const target = await prisma.target.findUnique({
      where: { id },
    });

    if (!target) {
      return jsonResponse(
        {
          ok: false,
          error: 'Target not found',
        },
        { status: 404 }
      );
    }

    // Check if user wants to reveal credentials (requires admin password confirmation)
    const url = new URL(request.url);
    const reveal = url.searchParams.get('reveal') === 'true';
    const adminPassword = url.searchParams.get('password');

    let credentials = '******';

    if (reveal && adminPassword === process.env.ADMIN_PASSWORD) {
      // Decrypt credentials
      const decrypted = await decrypt(target.credentials);
      credentials = JSON.parse(decrypted);
    }

    return jsonResponse({
      ok: true,
      target: {
        ...target,
        credentials,
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

export async function PATCH(request, { params }) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const { id } = await params;
    const body = await parseBody(request);
    const { name, type, credentials, isActive, frequency } = body;

    // Check if target exists
    const existingTarget = await prisma.target.findUnique({
      where: { id },
    });

    if (!existingTarget) {
      return jsonResponse(
        {
          ok: false,
          error: 'Target not found',
        },
        { status: 404 }
      );
    }

    // Build update data
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (frequency !== undefined) updateData.frequency = frequency;

    // Handle credentials update
    if (credentials !== undefined && credentials !== '******') {
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

      updateData.credentials = await encrypt(JSON.stringify(credentialsObj));
    }

    // Update target
    const target = await prisma.target.update({
      where: { id },
      data: updateData,
    });

    return jsonResponse({
      ok: true,
      target: {
        ...target,
        credentials: '******',
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

export async function DELETE(request, { params }) {
  const authCheck = await requireAuth();
  if (!authCheck.authenticated) {
    return jsonResponse(
      { ok: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const { id } = await params;

    // Check if target exists
    const existingTarget = await prisma.target.findUnique({
      where: { id },
    });

    if (!existingTarget) {
      return jsonResponse(
        {
          ok: false,
          error: 'Target not found',
        },
        { status: 404 }
      );
    }

    // Delete target (cascades to RunItems)
    await prisma.target.delete({
      where: { id },
    });

    return jsonResponse({
      ok: true,
      message: 'Target deleted successfully',
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
