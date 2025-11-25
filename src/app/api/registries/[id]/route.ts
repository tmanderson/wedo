import { NextResponse } from "next/server";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";
import { validateBody, updateRegistrySchema } from "@/lib/validation";
import {
  getRegistryForViewer,
  updateRegistry,
} from "@/services/registryService";

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

/**
 * PATCH /api/registries/:id - Update registry settings
 */
export const PATCH = requireAuth(async (req: AuthenticatedRequest, context) => {
  const { id } = context?.params || {};

  if (!id) {
    return NextResponse.json(
      { error: { code: "ERR_VALIDATION", message: "Registry ID required" } },
      { status: 400 },
    );
  }

  const body = await req.json();
  const data = validateBody(updateRegistrySchema, body);

  const updatedRegistry = await updateRegistry(id, req.user.id, data);

  return NextResponse.json(updatedRegistry);
});
