import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody, updateUserProfileSchema } from "@/lib/validation";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/profile - Get current user's profile
 */
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
});

/**
 * PATCH /api/user/profile - Update current user's profile
 */
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const body = await req.json();
  const data = validateBody(updateUserProfileSchema, body);

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: data.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updatedUser);
});
