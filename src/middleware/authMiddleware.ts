import { NextRequest, NextResponse } from "next/server";
import {
  verifySupabaseJwt,
  extractBearerToken,
  AuthError,
  type UserSession,
} from "@/lib/auth";
import { mapErrorToResponse } from "@/lib/errors";

export interface AuthenticatedRequest extends NextRequest {
  user: UserSession;
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: { params?: Record<string, string> },
) => Promise<NextResponse>;

export type RouteHandler = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps a route handler with authentication and error handling
 * Verifies the Supabase JWT and attaches user info to the request
 * Also catches and formats any errors thrown by the handler
 *
 * @param handler - The route handler to wrap
 * @returns A wrapped handler that requires authentication
 */
export function requireAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      const authHeader = req.headers.get("authorization");
      const token = extractBearerToken(authHeader);

      if (!token) {
        return NextResponse.json(
          {
            error: {
              code: "ERR_NOT_AUTHENTICATED",
              message: "Missing or invalid Authorization header",
            },
          },
          { status: 401 },
        );
      }

      const { userId, email } = await verifySupabaseJwt(token);

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = { id: userId, email };

      // Resolve params if they're a promise (Next.js 15+ pattern)
      const resolvedParams = context?.params ? await context.params : undefined;

      return await handler(authenticatedReq, { params: resolvedParams });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: error.status },
        );
      }

      // Use centralized error mapping for all other errors
      const { status, body } = mapErrorToResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}

/**
 * Optional auth wrapper - doesn't require auth but attaches user if present
 * Also includes error handling
 */
export function optionalAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      const authHeader = req.headers.get("authorization");
      const token = extractBearerToken(authHeader);

      const authenticatedReq = req as AuthenticatedRequest;

      if (token) {
        try {
          const { userId, email } = await verifySupabaseJwt(token);
          authenticatedReq.user = { id: userId, email };
        } catch {
          // Token invalid but that's okay for optional auth
          authenticatedReq.user = undefined as unknown as UserSession;
        }
      } else {
        authenticatedReq.user = undefined as unknown as UserSession;
      }

      // Resolve params if they're a promise
      const resolvedParams = context?.params ? await context.params : undefined;

      return await handler(authenticatedReq, { params: resolvedParams });
    } catch (error) {
      const { status, body } = mapErrorToResponse(error);
      return NextResponse.json(body, { status });
    }
  };
}
