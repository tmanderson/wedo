import { SignJWT } from 'jose';
import { verifySupabaseJwt, extractBearerToken, AuthError } from '@/lib/auth';

// Test secret for JWT signing
const TEST_SECRET = 'test-jwt-secret-at-least-32-characters-long';
const TEST_SUPABASE_URL = 'https://test.supabase.co';

// Helper to create test JWTs
async function createTestJwt(
  payload: Record<string, unknown>,
  options: { expiresIn?: string; secret?: string } = {}
): Promise<string> {
  const secret = new TextEncoder().encode(options.secret || TEST_SECRET);

  let builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(`${TEST_SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated');

  if (options.expiresIn) {
    builder = builder.setExpirationTime(options.expiresIn);
  } else {
    builder = builder.setExpirationTime('1h');
  }

  return builder.sign(secret);
}

describe('Auth Library', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: TEST_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: TEST_SUPABASE_URL,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractBearerToken('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should handle lowercase bearer', () => {
      const token = extractBearerToken('bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for missing header', () => {
      expect(extractBearerToken(null)).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(extractBearerToken('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
      expect(extractBearerToken('Bearer')).toBeNull();
      expect(extractBearerToken('abc123')).toBeNull();
    });
  });

  describe('verifySupabaseJwt', () => {
    it('should verify a valid JWT and return user info', async () => {
      const token = await createTestJwt({
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await verifySupabaseJwt(token);

      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.payload).toBeDefined();
    });

    it('should verify JWT without email', async () => {
      const token = await createTestJwt({
        sub: 'user-456',
      });

      const result = await verifySupabaseJwt(token);

      expect(result.userId).toBe('user-456');
      expect(result.email).toBeUndefined();
    });

    it('should throw AuthError for expired token', async () => {
      const token = await createTestJwt(
        { sub: 'user-123' },
        { expiresIn: '-1h' } // Already expired
      );

      await expect(verifySupabaseJwt(token)).rejects.toThrow(AuthError);
      await expect(verifySupabaseJwt(token)).rejects.toMatchObject({
        code: 'ERR_TOKEN_EXPIRED',
      });
    });

    it('should throw AuthError for invalid signature', async () => {
      const token = await createTestJwt(
        { sub: 'user-123' },
        { secret: 'different-secret-that-is-long-enough' }
      );

      await expect(verifySupabaseJwt(token)).rejects.toThrow(AuthError);
      await expect(verifySupabaseJwt(token)).rejects.toMatchObject({
        code: 'ERR_INVALID_TOKEN',
      });
    });

    it('should throw AuthError for missing subject claim', async () => {
      const token = await createTestJwt({
        email: 'test@example.com',
        // No 'sub' claim
      });

      await expect(verifySupabaseJwt(token)).rejects.toThrow(AuthError);
      await expect(verifySupabaseJwt(token)).rejects.toMatchObject({
        code: 'ERR_INVALID_TOKEN',
        message: 'Token missing subject claim',
      });
    });

    it('should throw AuthError for malformed token', async () => {
      await expect(verifySupabaseJwt('not-a-valid-jwt')).rejects.toThrow(AuthError);
      await expect(verifySupabaseJwt('not-a-valid-jwt')).rejects.toMatchObject({
        code: 'ERR_INVALID_TOKEN',
      });
    });

    it('should throw AuthError when JWT secret is not configured', async () => {
      delete process.env.SUPABASE_JWT_SECRET;

      const token = await createTestJwt({ sub: 'user-123' });

      await expect(verifySupabaseJwt(token)).rejects.toThrow(AuthError);
      await expect(verifySupabaseJwt(token)).rejects.toMatchObject({
        code: 'ERR_SERVER_CONFIG',
        status: 500,
      });
    });
  });
});

describe('AuthError', () => {
  it('should create error with default values', () => {
    const error = new AuthError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('ERR_NOT_AUTHENTICATED');
    expect(error.status).toBe(401);
    expect(error.name).toBe('AuthError');
  });

  it('should create error with custom values', () => {
    const error = new AuthError('Custom error', 'ERR_CUSTOM', 403);

    expect(error.message).toBe('Custom error');
    expect(error.code).toBe('ERR_CUSTOM');
    expect(error.status).toBe(403);
  });
});
