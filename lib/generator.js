/**
 * Generate HMAC signature using Web Crypto API
 */
async function generateHmac(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC signature
 */
async function verifyHmac(data, signature, secret) {
  const expectedSignature = await generateHmac(data, secret);
  return signature === expectedSignature;
}

/**
 * Base64url encoding
 */
function base64urlEncode(str) {
  const base64 = btoa(str);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64url decoding
 */
function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += '='.repeat(4 - padding);
  }

  return atob(base64);
}

/**
 * Generate KEEPALIVE_TARGETS environment variable
 */
export async function generateKeepaliveTargets(targets, secret) {
  if (!secret) {
    throw new Error('KEEPALIVE_SECRET is required');
  }

  const payload = {
    targets: await Promise.all(
      targets.map(async (target) => {
        const { id, type, name, credentials } = target;

        // Parse credentials if string
        const creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;

        // Create canonical string for signing
        const canonicalString = JSON.stringify({
          id,
          type,
          name,
          payload: creds,
        });

        // Generate signature
        const sig = await generateHmac(canonicalString, secret);

        return {
          id,
          type,
          name,
          payload: creds,
          sig,
        };
      })
    ),
  };

  // Encode as base64url
  const json = JSON.stringify(payload);
  const encoded = base64urlEncode(json);

  return `KEEPALIVE_TARGETS="${encoded}"`;
}

/**
 * Validate KEEPALIVE_TARGETS
 */
export async function validateKeepaliveTargets(encoded, secret) {
  if (!secret) {
    throw new Error('KEEPALIVE_SECRET is required');
  }

  try {
    // Decode
    const json = base64urlDecode(encoded);
    const payload = JSON.parse(json);

    if (!payload.targets || !Array.isArray(payload.targets)) {
      throw new Error('Invalid payload format');
    }

    // Verify each signature
    const results = await Promise.all(
      payload.targets.map(async (target) => {
        const { id, type, name, payload: creds, sig } = target;

        const canonicalString = JSON.stringify({
          id,
          type,
          name,
          payload: creds,
        });

        const valid = await verifyHmac(canonicalString, sig, secret);

        return { id, name, valid };
      })
    );

    const allValid = results.every((r) => r.valid);

    return {
      valid: allValid,
      targets: results,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}
