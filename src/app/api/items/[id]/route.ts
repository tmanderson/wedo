import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody, updateItemSchema } from "@/lib/validation";
import { updateItem, softDeleteItem, getItem } from "@/services/itemService";

/**
 * GET /api/items/:id - Get an item with visibility rules applied
 */
export const GET = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
      { status: 400 },
    );
  }

  const item = await getItem(id, req.user.id);

  return NextResponse.json(item);
});

/**
 * PATCH /api/items/:id - Update an item
 * Only the sublist owner can update their items
 */
export const PATCH = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
      { status: 400 },
    );
  }

  const body = await req.json();
  const data = validateBody(updateItemSchema, body);

  const item = await updateItem(id, req.user.id, data);

  return NextResponse.json(item);
});

/**
 * DELETE /api/items/:id - Soft-delete an item
 * Only the sublist owner can delete their items
 */
export const DELETE = requireAuth(
  async (req: AuthenticatedRequest, context) => {
    const { id } = context?.params || {};

    if (!id) {
      return NextResponse.json(
        { error: { code: "ERR_VALIDATION", message: "Item ID required" } },
        { status: 400 },
      );
    }

    const item = await softDeleteItem(id, req.user.id);

    return NextResponse.json(item);
  },
);
