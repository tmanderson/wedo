import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { markBought } from "@/services/itemService";

/**
 * POST /api/items/:id/mark-bought - Mark an item as bought
 * Only the current claimer can mark as bought
 */
export const POST = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
      { status: 400 },
    );
  }

  const item = await markBought(id, req.user.id);

  return NextResponse.json(item);
});
