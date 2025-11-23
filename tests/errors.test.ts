import { z } from 'zod';
import {
  ApiError,
  ErrorCodes,
  Errors,
  mapErrorToResponse,
} from '@/lib/errors';
import {
  validateBody,
  validateQuery,
  createRegistrySchema,
  createInviteSchema,
  createItemSchema,
} from '@/lib/validation';

describe('ApiError', () => {
  it('should create error with all properties', () => {
    const error = new ApiError(400, 'Test message', ErrorCodes.ERR_VALIDATION, {
      field: 'email',
    });

    expect(error.status).toBe(400);
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('ERR_VALIDATION');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.name).toBe('ApiError');
  });

  it('should use default code when not provided', () => {
    const error = new ApiError(500, 'Server error');

    expect(error.code).toBe('ERR_INTERNAL');
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiError(404, 'Not found', ErrorCodes.ERR_NOT_FOUND);

    expect(error.toJSON()).toEqual({
      error: {
        code: 'ERR_NOT_FOUND',
        message: 'Not found',
      },
    });
  });

  it('should include details in JSON when present', () => {
    const error = new ApiError(400, 'Bad request', ErrorCodes.ERR_VALIDATION, {
      errors: ['field1', 'field2'],
    });

    expect(error.toJSON()).toEqual({
      error: {
        code: 'ERR_VALIDATION',
        message: 'Bad request',
        details: { errors: ['field1', 'field2'] },
      },
    });
  });
});

describe('Errors factory', () => {
  it('should create notFound error', () => {
    const error = Errors.notFound('User');

    expect(error.status).toBe(404);
    expect(error.message).toBe('User not found');
    expect(error.code).toBe('ERR_NOT_FOUND');
  });

  it('should create forbidden error', () => {
    const error = Errors.forbidden();

    expect(error.status).toBe(403);
    expect(error.code).toBe('ERR_FORBIDDEN');
  });

  it('should create validation error with details', () => {
    const error = Errors.validation('Invalid input', { field: 'email' });

    expect(error.status).toBe(422);
    expect(error.code).toBe('ERR_VALIDATION');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should create alreadyClaimed error', () => {
    const error = Errors.alreadyClaimed({ id: '123', name: 'John' });

    expect(error.status).toBe(409);
    expect(error.code).toBe('ERR_ALREADY_CLAIMED');
    expect(error.details).toEqual({ id: '123', name: 'John' });
  });

  it('should create duplicateInvite error', () => {
    const error = Errors.duplicateInvite('test@example.com');

    expect(error.status).toBe(409);
    expect(error.code).toBe('ERR_DUPLICATE_INVITE');
    expect(error.message).toContain('test@example.com');
  });

  it('should create invite errors', () => {
    expect(Errors.inviteInvalid().code).toBe('ERR_INVITE_INVALID');
    expect(Errors.inviteExpired().code).toBe('ERR_INVITE_EXPIRED');
    expect(Errors.inviteUsed().code).toBe('ERR_INVITE_USED');
    expect(Errors.emailMismatch().code).toBe('ERR_EMAIL_MISMATCH');
  });
});

describe('mapErrorToResponse', () => {
  it('should map ApiError correctly', () => {
    const error = new ApiError(400, 'Bad request', ErrorCodes.ERR_VALIDATION);
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ERR_VALIDATION');
    expect(response.body.error.message).toBe('Bad request');
  });

  it('should map standard Error to 500', () => {
    const error = new Error('Something went wrong');
    const response = mapErrorToResponse(error);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('ERR_INTERNAL');
  });

  it('should handle unknown error types', () => {
    const response = mapErrorToResponse('string error');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('ERR_INTERNAL');
  });
});

describe('validateBody', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it('should return parsed data for valid input', () => {
    const result = validateBody(testSchema, { name: 'John', age: 25 });

    expect(result).toEqual({ name: 'John', age: 25 });
  });

  it('should throw ApiError for invalid input', () => {
    expect(() => validateBody(testSchema, { name: '', age: -1 })).toThrow(
      ApiError
    );
  });

  it('should include validation details in error', () => {
    try {
      validateBody(testSchema, { name: '', age: -1 });
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe('ERR_VALIDATION');
      expect(apiError.details).toHaveProperty('errors');
    }
  });
});

describe('validateQuery', () => {
  const testSchema = z.object({
    page: z.coerce.number().default(1),
    search: z.string().optional(),
  });

  it('should parse URLSearchParams correctly', () => {
    const params = new URLSearchParams('page=2&search=test');
    const result = validateQuery(testSchema, params);

    expect(result).toEqual({ page: 2, search: 'test' });
  });

  it('should use defaults for missing params', () => {
    const params = new URLSearchParams('');
    const result = validateQuery(testSchema, params);

    expect(result.page).toBe(1);
  });

  it('should throw ApiError for invalid params', () => {
    const strictSchema = z.object({
      required: z.string().min(1),
    });
    const params = new URLSearchParams('');

    expect(() => validateQuery(strictSchema, params)).toThrow(ApiError);
  });
});

describe('Schema validations', () => {
  describe('createRegistrySchema', () => {
    it('should accept valid registry data', () => {
      const valid = {
        title: 'Holiday Gifts',
        occasionDate: '2025-12-25T00:00:00.000Z',
        collaboratorsCanInvite: true,
      };

      const result = createRegistrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalid = { title: '' };
      const result = createRegistrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should provide default for collaboratorsCanInvite', () => {
      const valid = { title: 'Test' };
      const result = createRegistrySchema.parse(valid);
      expect(result.collaboratorsCanInvite).toBe(false);
    });
  });

  describe('createInviteSchema', () => {
    it('should accept valid invite data', () => {
      const valid = {
        emails: [
          { email: 'test@example.com', name: 'Test User' },
          { email: 'another@example.com' },
        ],
      };

      const result = createInviteSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty emails array', () => {
      const invalid = { emails: [] };
      const result = createInviteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalid = { emails: [{ email: 'not-an-email' }] };
      const result = createInviteSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should lowercase emails', () => {
      const valid = { emails: [{ email: 'TEST@EXAMPLE.COM' }] };
      const result = createInviteSchema.parse(valid);
      expect(result.emails[0].email).toBe('test@example.com');
    });
  });

  describe('createItemSchema', () => {
    it('should accept item with label', () => {
      const valid = { label: 'A nice gift' };
      const result = createItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept item with URL', () => {
      const valid = { url: 'https://example.com/gift' };
      const result = createItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept item with both label and URL', () => {
      const valid = { label: 'Gift', url: 'https://example.com' };
      const result = createItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject item with neither label nor URL', () => {
      const invalid = {};
      const result = createItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const invalid = { url: 'not-a-url' };
      const result = createItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
