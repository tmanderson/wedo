import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { Errors } from "@/lib/errors";
import { validateBody, createInviteSchema } from "@/lib/validation";
import { canUserInvite } from "@/services/registryService";
import { createInviteTokens } from "@/services/inviteService";

/**
 * POST /api/registries/:id/invite - Invite collaborators to a registry
 */
export const POST = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id: registryId } = context?.params || {};

  if (!registryId) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Registry ID required" } },
      { status: 400 },
    );
  }

  // Validate request body
  const body = await req.json();
  const { emails } = validateBody(createInviteSchema, body);

  // Check if user can invite
  const canInvite = await canUserInvite(registryId, req.user.id);
  if (!canInvite) {
    throw Errors.forbidden(
      "You do not have permission to invite collaborators",
    );
  }

  // Create invites and send emails
  const results = await createInviteTokens(registryId, emails, req.user.id);

  // Determine overall success
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failureCount,
    },
  });
});
