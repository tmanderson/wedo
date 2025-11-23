import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { removeCollaborator } from "@/services/collaboratorService";

/**
 * DELETE /api/registries/:id/collaborators/:collabId - Remove a collaborator
 */
export const DELETE = requireAuth(
  async (req: AuthenticatedRequest, context) => {
    const { id: registryId, collabId } = context?.params || {};

    if (!registryId || !collabId) {
      return NextResponse.json(
        {
          error: {
            code: "ERR_VALIDATION",
            message: "Registry ID and Collaborator ID required",
          },
        },
        { status: 400 },
      );
    }

    const result = await removeCollaborator(registryId, collabId, req.user.id);

    return NextResponse.json(result);
  },
);
