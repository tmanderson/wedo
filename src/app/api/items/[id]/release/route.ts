import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { releaseItem } from "@/services/itemService";

/**
 * POST /api/items/:id/release - Release a claim on an item
 * Only the current claimer can release
 */
export const POST = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
      { status: 400 },
    );
  }

  const item = await releaseItem(id, req.user.id);

  return NextResponse.json(item);
});
