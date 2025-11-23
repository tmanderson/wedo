import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { Errors } from "@/lib/errors";
import { validateQuery, acceptInviteQuerySchema } from "@/lib/validation";
import {
  validateAndConsumeInviteToken,
  getInviteTokenInfo,
} from "@/services/inviteService";
import prisma from "@/lib/prisma";

/**
 * GET /api/invite/accept?token=TOKEN - Accept an invite
 * Requires authentication (user must have signed in via magic link)
 */
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const url = new URL(req.url);
  const { token } = validateQuery(acceptInviteQuerySchema, url.searchParams);

  if (!req.user.email) {
    throw Errors.forbidden("Email not available from authentication");
  }

  // Ensure user exists in our database
  await prisma.user.upsert({
    where: { id: req.user.id },
    update: { lastAuthAt: new Date() },
    create: {
      id: req.user.id,
      email: req.user.email,
    },
  });

  // Validate and consume the invite token
  const result = await validateAndConsumeInviteToken(
    token,
    req.user.id,
    req.user.email,
  );

  return NextResponse.json({
    success: true,
    registry: {
      id: result.registry.id,
      title: result.registry.title,
    },
    collaborator: {
      id: result.collaborator.id,
      sublistId: result.collaborator.sublist?.id,
    },
  });
});

/**
 * POST /api/invite/info - Get invite info without consuming (public endpoint)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { error: { code: "ERR_VALIDATION", message: "Token required" } },
        { status: 400 },
      );
    }

    let info;
    try {
      info = await getInviteTokenInfo(token);
    } catch {
      // Database error or token not found - treat as invalid token
      return NextResponse.json(
        {
          error: {
            code: "ERR_INVITE_INVALID",
            message: "Invalid invite token",
          },
        },
        { status: 400 },
      );
    }

    if (!info) {
      return NextResponse.json(
        {
          error: {
            code: "ERR_INVITE_INVALID",
            message: "Invalid invite token",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      email: info.email,
      used: info.used,
      expired: info.expired,
      registry: info.registry
        ? {
            title: info.registry.title,
            occasionDate: info.registry.occasionDate,
            ownerName: info.registry.owner?.name,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Invalid request" } },
      { status: 400 },
    );
  }
}
