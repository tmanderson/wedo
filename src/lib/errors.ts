import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Standard error codes used across the application
 */
export const ErrorCodes = {
  // Authentication errors
  ERR_NOT_AUTHENTICATED: "ERR_NOT_AUTHENTICATED",
  ERR_TOKEN_EXPIRED: "ERR_TOKEN_EXPIRED",
  ERR_INVALID_TOKEN: "ERR_INVALID_TOKEN",

  // Authorization errors
  ERR_FORBIDDEN: "ERR_FORBIDDEN",

  // Resource errors
  ERR_NOT_FOUND: "ERR_NOT_FOUND",

  // Validation errors
  ERR_VALIDATION: "ERR_VALIDATION",

  // Conflict errors
  ERR_ALREADY_CLAIMED: "ERR_ALREADY_CLAIMED",
  ERR_DUPLICATE_INVITE: "ERR_DUPLICATE_INVITE",
  ERR_ITEM_DELETED: "ERR_ITEM_DELETED",

  // Invite errors
  ERR_INVITE_INVALID: "ERR_INVITE_INVALID",
  ERR_INVITE_EXPIRED: "ERR_INVITE_EXPIRED",
  ERR_INVITE_USED: "ERR_INVITE_USED",
  ERR_EMAIL_MISMATCH: "ERR_EMAIL_MISMATCH",

  // Server errors
  ERR_INTERNAL: "ERR_INTERNAL",
  ERR_SERVER_CONFIG: "ERR_SERVER_CONFIG",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Structured API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: ErrorCode = ErrorCodes.ERR_INTERNAL,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): { error: { code: string; message: string; details?: unknown } } {
    const result: { code: string; message: string; details?: unknown } = {
      code: this.code,
      message: this.message,
    };
    if (this.details) {
      result.details = this.details;
    }
    return { error: result };
  }
}

/**
 * Create common API errors
 */
export const Errors = {
  notFound: (resource: string) =>
    new ApiError(404, `${resource} not found`, ErrorCodes.ERR_NOT_FOUND),

  forbidden: (message = "You do not have permission to perform this action") =>
    new ApiError(403, message, ErrorCodes.ERR_FORBIDDEN),

  validation: (message: string, details?: unknown) =>
    new ApiError(422, message, ErrorCodes.ERR_VALIDATION, details),

  conflict: (message: string, code: ErrorCode, details?: unknown) =>
    new ApiError(409, message, code, details),

  alreadyClaimed: (claimerInfo?: { id: string; name?: string }) =>
    new ApiError(
      409,
      "Item is already claimed",
      ErrorCodes.ERR_ALREADY_CLAIMED,
      claimerInfo,
    ),

  duplicateInvite: (email: string) =>
    new ApiError(
      409,
      `An invite already exists for ${email}`,
      ErrorCodes.ERR_DUPLICATE_INVITE,
    ),

  inviteInvalid: () =>
    new ApiError(400, "Invalid invite token", ErrorCodes.ERR_INVITE_INVALID),

  inviteExpired: () =>
    new ApiError(
      410,
      "Invite token has expired",
      ErrorCodes.ERR_INVITE_EXPIRED,
    ),

  inviteUsed: () =>
    new ApiError(
      410,
      "Invite token has already been used",
      ErrorCodes.ERR_INVITE_USED,
    ),

  emailMismatch: () =>
    new ApiError(
      403,
      "The authenticated email does not match the invite",
      ErrorCodes.ERR_EMAIL_MISMATCH,
    ),

  itemDeleted: () =>
    new ApiError(409, "Item has been deleted", ErrorCodes.ERR_ITEM_DELETED),

  internal: (message = "Internal server error") =>
    new ApiError(500, message, ErrorCodes.ERR_INTERNAL),
};

/**
 * Maps various error types to API responses
 */
export function mapErrorToResponse(error: unknown): {
  status: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  // Handle our custom ApiError
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: error.toJSON(),
    };
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": // Unique constraint violation
        return {
          status: 409,
          body: {
            error: {
              code: ErrorCodes.ERR_VALIDATION,
              message: "A record with this value already exists",
              details: { field: error.meta?.target },
            },
          },
        };
      case "P2025": // Record not found
        return {
          status: 404,
          body: {
            error: {
              code: ErrorCodes.ERR_NOT_FOUND,
              message: "Record not found",
            },
          },
        };
      case "P2003": // Foreign key constraint failed
        return {
          status: 400,
          body: {
            error: {
              code: ErrorCodes.ERR_VALIDATION,
              message: "Referenced record does not exist",
            },
          },
        };
      default:
        return {
          status: 500,
          body: {
            error: {
              code: ErrorCodes.ERR_INTERNAL,
              message: "Database error",
            },
          },
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      body: {
        error: {
          code: ErrorCodes.ERR_VALIDATION,
          message: "Invalid data provided",
        },
      },
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    console.error("Unhandled error:", error);
    return {
      status: 500,
      body: {
        error: {
          code: ErrorCodes.ERR_INTERNAL,
          message: "Internal server error",
        },
      },
    };
  }

  // Unknown error type
  console.error("Unknown error type:", error);
  return {
    status: 500,
    body: {
      error: {
        code: ErrorCodes.ERR_INTERNAL,
        message: "Internal server error",
      },
    },
  };
}

/**
 * Higher-order function that wraps a route handler with error handling
 */
export function withErrorHandling<
  T extends (...args: never[]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      const { status, body } = mapErrorToResponse(error);
      return NextResponse.json(body, { status });
    }
  }) as T;
}
