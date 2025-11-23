import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { claimItem } from "@/services/itemService";

/**
 * POST /api/items/:id/claim - Claim an item
 * Only collaborators (not the sublist owner) can claim items
 */
export const POST = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
      { status: 400 },
    );
  }

  const item = await claimItem(id, req.user.id);

  return NextResponse.json(item);
});
