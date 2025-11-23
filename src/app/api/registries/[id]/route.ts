import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { getRegistryForViewer } from "@/services/registryService";

/**
 * GET /api/registries/:id - Get registry with full details and visibility rules applied
 */
export const GET = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Registry ID required" } },
      { status: 400 },
    );
  }

  const registry = await getRegistryForViewer(id, req.user.id);

  return NextResponse.json(registry);
});
