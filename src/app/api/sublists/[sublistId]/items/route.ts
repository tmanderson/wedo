import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody, createItemSchema } from "@/lib/validation";
import { createItem } from "@/services/itemService";

/**
 * POST /api/sublists/:sublistId/items - Create a new item on a sublist
 * Only the sublist owner can create items
 */
export const POST = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { sublistId } = context?.params || {};

  if (!sublistId) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Sublist ID required" } },
      { status: 400 },
    );
  }

  const body = await req.json();
  const data = validateBody(createItemSchema, body);

  const item = await createItem(sublistId, req.user.id, data);

  return NextResponse.json(item, { status: 201 });
});
