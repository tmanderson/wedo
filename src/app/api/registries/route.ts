import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody, createRegistrySchema } from "@/lib/validation";
import {
  createRegistry,
  listRegistriesForUser,
} from "@/services/registryService";
import prisma from "@/lib/prisma";

/**
 * POST /api/registries - Create a new registry
 */
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const body = await req.json();
  const data = validateBody(createRegistrySchema, body);

  // Ensure user exists in our database
  const user = await prisma.user.upsert({
    where: { id: req.user.id },
    update: { lastAuthAt: new Date() },
    create: {
      id: req.user.id,
      email: req.user.email!,
    },
  });

  const registry = await createRegistry(req.user.id, user.email, data);

  return NextResponse.json(registry, { status: 201 });
});

/**
 * GET /api/registries - List registries for the authenticated user
 */
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const registries = await listRegistriesForUser(req.user.id);

  return NextResponse.json({ registries });
});
