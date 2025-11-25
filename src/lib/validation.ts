import { z } from "zod";
import { ApiError, ErrorCodes } from "./errors";

/**
 * Format Zod errors into a readable structure
 */
function formatZodErrors(
  error: z.ZodError,
): Array<{ path: string; message: string }> {
  // Zod v4 uses issues instead of errors
  const issues = error.issues || [];
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Validates request body against a Zod schema
 * @throws ApiError with status 422 if validation fails
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const formattedErrors = formatZodErrors(result.error);

    throw new ApiError(422, "Validation failed", ErrorCodes.ERR_VALIDATION, {
      errors: formattedErrors,
    });
  }

  return result.data;
}

/**
 * Validates query parameters against a Zod schema
 * @throws ApiError with status 400 if validation fails
 */
export function validateQuery<T extends z.ZodType>(
  schema: T,
  params: URLSearchParams,
): z.infer<T> {
  // Convert URLSearchParams to plain object
  const queryObject: Record<string, string> = {};
  params.forEach((value, key) => {
    queryObject[key] = value;
  });

  const result = schema.safeParse(queryObject);

  if (!result.success) {
    const formattedErrors = formatZodErrors(result.error);

    throw new ApiError(
      400,
      "Invalid query parameters",
      ErrorCodes.ERR_VALIDATION,
      { errors: formattedErrors },
    );
  }

  return result.data;
}

/**
 * Common validation schemas
 */
export const schemas = {
  // UUID validation
  uuid: z.string().uuid("Invalid UUID format"),

  // Email validation
  email: z.string().email("Invalid email format").toLowerCase(),

  // Non-empty string
  nonEmptyString: z.string().min(1, "This field is required"),

  // Optional ISO date string (accepts YYYY-MM-DD or full ISO datetime)
  isoDateOptional: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        // Accept YYYY-MM-DD format
        const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateOnlyRegex.test(val)) {
          const date = new Date(val);
          return !isNaN(date.getTime());
        }
        // Accept full ISO datetime
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "Invalid date format. Use YYYY-MM-DD or ISO 8601 format." },
    )
    .optional()
    .nullable(),

  // URL validation
  url: z.string().url("Invalid URL format").optional().nullable(),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
};

/**
 * Registry creation schema
 */
export const createRegistrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  occasionDate: schemas.isoDateOptional,
  deadline: schemas.isoDateOptional,
  collaboratorsCanInvite: z.boolean().default(false),
  initialMembers: z
    .array(
      z.object({
        email: schemas.email,
        name: z.string().max(100).optional().nullable(),
        description: z.string().max(1000).optional().nullable(),
        items: z
          .array(
            z.object({
              label: z.string().max(500).optional().nullable(),
              url: z
                .string()
                .transform((val) => (val === "" ? null : val))
                .pipe(z.string().url("Invalid URL format").nullable())
                .optional()
                .nullable(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .optional()
    .default([]),
});

export type CreateRegistryInput = z.infer<typeof createRegistrySchema>;

/**
 * Registry update schema
 */
export const updateRegistrySchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .optional(),
  occasionDate: schemas.isoDateOptional,
  deadline: schemas.isoDateOptional,
  collaboratorsCanInvite: z.boolean().optional(),
  ownerId: schemas.uuid.optional(),
});

export type UpdateRegistryInput = z.infer<typeof updateRegistrySchema>;

/**
 * Invite creation schema
 */
export const createInviteSchema = z.object({
  emails: z
    .array(
      z.object({
        email: schemas.email,
        name: z.string().max(100).optional().nullable(),
      }),
    )
    .min(1, "At least one email is required")
    .max(50, "Cannot invite more than 50 people at once"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * User profile update schema
 */
export const updateUserProfileSchema = z.object({
  name: z.string().max(100, "Name is too long").optional().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

/**
 * Item creation schema
 */
export const createItemSchema = z
  .object({
    label: z.string().max(500).optional().nullable(),
    url: schemas.url,
    description: z.string().max(1000).optional().nullable(),
  })
  .refine((data) => data.label || data.url, {
    message: "Either label or URL must be provided",
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;

/**
 * Item update schema
 */
export const updateItemSchema = z.object({
  label: z.string().max(500).optional().nullable(),
  url: schemas.url,
  description: z.string().max(1000).optional().nullable(),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/**
 * Accept invite query schema
 */
export const acceptInviteQuerySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type AcceptInviteQuery = z.infer<typeof acceptInviteQuerySchema>;
