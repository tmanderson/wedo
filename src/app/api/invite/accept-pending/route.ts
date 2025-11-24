import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { Errors } from "@/lib/errors";
import { acceptPendingInvitesByEmail } from "@/services/inviteService";
import prisma from "@/lib/prisma";

/**
 * POST /api/invite/accept-pending - Accept all pending invites for the authenticated user
 * This is called after authentication to automatically accept any pending invites
 * that match the user's email address.
 */
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
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

  // Accept all pending invites for this email
  const result = await acceptPendingInvitesByEmail(req.user.id, req.user.email);

  return NextResponse.json({
    success: true,
    accepted: result.accepted,
    count: result.count,
  });
});
