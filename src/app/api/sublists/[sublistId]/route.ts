import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody } from "@/lib/validation";
import prisma from "@/lib/prisma";

const updateSublistSchema = z.object({
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * PATCH /api/sublists/:sublistId - Update a sublist
 * Only the sublist owner can update their sublist
 */
export const PATCH = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { sublistId } = context?.params || {};

  if (!sublistId) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Sublist ID required" } },
      { status: 400 },
    );
  }

  const body = await req.json();
  const data = validateBody(updateSublistSchema, body);

  // Find the sublist and verify ownership
  const sublist = await prisma.subList.findUnique({
    where: { id: sublistId },
    include: {
      collaborator: true,
    },
  });

  if (!sublist) {
    return NextResponse.json(
      { error: { code: "ERR_NOT_FOUND", message: "Sublist not found" } },
      { status: 404 },
    );
  }

  // Check if the user is the owner of the sublist
  if (sublist.collaborator.userId !== req.user.id) {
    return NextResponse.json(
      {
        error: {
          code: "ERR_FORBIDDEN",
          message: "Only the sublist owner can update this sublist",
        },
      },
      { status: 403 },
    );
  }

  // Update the sublist
  const updatedSublist = await prisma.subList.update({
    where: { id: sublistId },
    data: {
      name: data.name,
      description: data.description,
    },
  });

  return NextResponse.json(updatedSublist);
});

/**
 * DELETE /api/sublists/:sublistId - Delete a sublist
 * Only the sublist owner can delete their sublist
 */
export const DELETE = requireAuth(
  async (req: AuthenticatedRequest, context) => {
    const { sublistId } = context?.params || {};

    if (!sublistId) {
      return NextResponse.json(
        { error: { code: "ERR_VALIDATION", message: "Sublist ID required" } },
        { status: 400 },
      );
    }

    // Find the sublist and verify ownership
    const sublist = await prisma.subList.findUnique({
      where: { id: sublistId },
      include: {
        collaborator: true,
      },
    });

    if (!sublist) {
      return NextResponse.json(
        { error: { code: "ERR_NOT_FOUND", message: "Sublist not found" } },
        { status: 404 },
      );
    }

    // Check if the user is the owner of the sublist
    if (sublist.collaborator.userId !== req.user.id) {
      return NextResponse.json(
        {
          error: {
            code: "ERR_FORBIDDEN",
            message: "Only the sublist owner can delete this sublist",
          },
        },
        { status: 403 },
      );
    }

    // Delete the sublist (this will cascade delete items)
    await prisma.subList.delete({
      where: { id: sublistId },
    });

    return NextResponse.json({ success: true });
  },
);
