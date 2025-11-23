import { jwtVerify, type JWTPayload } from 'jose';

export interface UserSession {
  id: string;
  email?: string;
}

export interface VerifyResult {
  userId: string;
  email?: string;
  payload: JWTPayload;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = 'ERR_NOT_AUTHENTICATED',
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Verifies a Supabase JWT token using the SUPABASE_JWT_SECRET
 * @param token - The JWT token to verify
 * @returns The verified payload with userId and email
 * @throws AuthError if token is invalid or expired
 */
export async function verifySupabaseJwt(token: string): Promise<VerifyResult> {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new AuthError(
      'Server configuration error: JWT secret not configured',
      'ERR_SERVER_CONFIG',
      500
    );
  }

  try {
    const secretKey = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, secretKey, {
      // Optionally validate issuer if NEXT_PUBLIC_SUPABASE_URL is set
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL && {
        issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      }),
      audience: 'authenticated',
    });

    const userId = payload.sub;
    if (!userId) {
      throw new AuthError('Token missing subject claim', 'ERR_INVALID_TOKEN');
    }

    return {
      userId,
      email: payload.email as string | undefined,
      payload,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    // Handle jose-specific errors
    const err = error as Error;
    if (err.name === 'JWTExpired') {
      throw new AuthError('Token has expired', 'ERR_TOKEN_EXPIRED');
    }
    if (err.name === 'JWTClaimValidationFailed') {
      throw new AuthError('Token validation failed', 'ERR_INVALID_TOKEN');
    }
    if (err.name === 'JWSSignatureVerificationFailed') {
      throw new AuthError('Invalid token signature', 'ERR_INVALID_TOKEN');
    }

    throw new AuthError(
      'Invalid or malformed token',
      'ERR_INVALID_TOKEN'
    );
  }
}

/**
 * Extracts the Bearer token from an Authorization header
 * @param authHeader - The Authorization header value
 * @returns The token string or null if not found
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
