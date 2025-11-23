import { PrismaClient, CollaboratorStatus } from "@prisma/client";
import { Errors } from "@/lib/errors";
import type { CreateRegistryInput } from "@/lib/validation";

const prisma = new PrismaClient();

export interface RegistryCreateResult {
  id: string;
  title: string;
  occasionDate: Date | null;
  deadline: Date | null;
  ownerId: string;
  collaboratorsCanInvite: boolean;
  createdAt: Date;
  collaboratorId: string;
  sublistId: string;
}

/**
 * Creates a new registry with owner collaborator and sublist
 */
export async function createRegistry(
  userId: string,
  userEmail: string,
  data: CreateRegistryInput,
): Promise<RegistryCreateResult> {
  return prisma.$transaction(async (tx) => {
    // Create the registry
    const registry = await tx.registry.create({
      data: {
        title: data.title,
        occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        ownerId: userId,
        collaboratorsCanInvite: data.collaboratorsCanInvite ?? false,
      },
    });

    // Create owner's collaborator entry (ACCEPTED)
    const collaborator = await tx.collaborator.create({
      data: {
        registryId: registry.id,
        userId: userId,
        email: userEmail,
        status: CollaboratorStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    // Create owner's sublist
    const sublist = await tx.subList.create({
      data: {
        registryId: registry.id,
        collaboratorId: collaborator.id,
      },
    });

    return {
      id: registry.id,
      title: registry.title,
      occasionDate: registry.occasionDate,
      deadline: registry.deadline,
      ownerId: registry.ownerId,
      collaboratorsCanInvite: registry.collaboratorsCanInvite,
      createdAt: registry.createdAt,
      collaboratorId: collaborator.id,
      sublistId: sublist.id,
    };
  });
}

/**
 * Lists all registries the user is part of (owner or accepted collaborator)
 */
export async function listRegistriesForUser(userId: string) {
  const collaborations = await prisma.collaborator.findMany({
    where: {
      userId,
      status: CollaboratorStatus.ACCEPTED,
    },
    include: {
      registry: {
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { collaborators: true },
          },
        },
      },
    },
    orderBy: {
      registry: {
        createdAt: "desc",
      },
    },
  });

  return collaborations.map((c) => ({
    id: c.registry.id,
    title: c.registry.title,
    occasionDate: c.registry.occasionDate,
    deadline: c.registry.deadline,
    isOwner: c.registry.ownerId === userId,
    owner: c.registry.owner,
    collaboratorCount: c.registry._count.collaborators,
    createdAt: c.registry.createdAt,
  }));
}

/**
 * Gets a registry with full details, applying visibility rules for the viewer
 */
export async function getRegistryForViewer(
  registryId: string,
  viewerUserId: string,
) {
  // First verify the user is a collaborator
  const viewerCollaborator = await prisma.collaborator.findFirst({
    where: {
      registryId,
      userId: viewerUserId,
      status: CollaboratorStatus.ACCEPTED,
    },
  });

  if (!viewerCollaborator) {
    throw Errors.forbidden("You are not a member of this registry");
  }

  const registry = await prisma.registry.findUnique({
    where: { id: registryId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      collaborators: {
        where: {
          status: { not: CollaboratorStatus.REMOVED },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          sublist: {
            include: {
              items: {
                include: {
                  createdByUser: {
                    select: { id: true, name: true, email: true },
                  },
                  claimedByUser: {
                    select: { id: true, name: true, email: true },
                  },
                  deletedByUser: {
                    select: { id: true, name: true },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!registry) {
    throw Errors.notFound("Registry");
  }

  // Apply visibility rules
  return applyVisibilityRules(registry, viewerUserId);
}

/**
 * Applies visibility rules to registry data
 * - Owners cannot see claim/bought metadata on their own sublist items
 */
function applyVisibilityRules(
  registry: Awaited<ReturnType<typeof getRegistryRaw>>,
  viewerUserId: string,
) {
  const collaborators = registry.collaborators.map((collaborator) => {
    const isViewerOwner = collaborator.userId === viewerUserId;

    const sublist = collaborator.sublist
      ? {
          id: collaborator.sublist.id,
          items: collaborator.sublist.items.map((item) => {
            // If viewer owns this sublist, redact claim info
            if (isViewerOwner) {
              return {
                id: item.id,
                label: item.label,
                url: item.url,
                parsedTitle: item.parsedTitle,
                createdAt: item.createdAt,
                deletedAt: item.deletedAt,
                deletedByUser: item.deletedByUser,
                // Redacted fields for owner
                status: null,
                claimedByUser: null,
                claimedAt: null,
                boughtAt: null,
              };
            }

            // For other viewers, show full item info
            return {
              id: item.id,
              label: item.label,
              url: item.url,
              parsedTitle: item.parsedTitle,
              createdAt: item.createdAt,
              deletedAt: item.deletedAt,
              deletedByUser: item.deletedByUser,
              status: item.status,
              claimedByUser: item.claimedByUser,
              claimedAt: item.claimedAt,
              boughtAt: item.boughtAt,
            };
          }),
        }
      : null;

    return {
      id: collaborator.id,
      email: collaborator.email,
      name: collaborator.name,
      status: collaborator.status,
      acceptedAt: collaborator.acceptedAt,
      user: collaborator.user,
      isViewer: collaborator.userId === viewerUserId,
      sublist,
    };
  });

  return {
    id: registry.id,
    title: registry.title,
    occasionDate: registry.occasionDate,
    deadline: registry.deadline,
    ownerId: registry.ownerId,
    owner: registry.owner,
    collaboratorsCanInvite: registry.collaboratorsCanInvite,
    createdAt: registry.createdAt,
    updatedAt: registry.updatedAt,
    isOwner: registry.ownerId === viewerUserId,
    collaborators,
  };
}

// Helper function used for its return type via ReturnType<typeof getRegistryRaw>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getRegistryRaw(registryId: string) {
  return prisma.registry.findUniqueOrThrow({
    where: { id: registryId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      collaborators: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          sublist: {
            include: {
              items: {
                include: {
                  createdByUser: {
                    select: { id: true, name: true, email: true },
                  },
                  claimedByUser: {
                    select: { id: true, name: true, email: true },
                  },
                  deletedByUser: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Checks if a user can invite to a registry
 */
export async function canUserInvite(
  registryId: string,
  userId: string,
): Promise<boolean> {
  const registry = await prisma.registry.findUnique({
    where: { id: registryId },
    include: {
      collaborators: {
        where: {
          userId,
          status: CollaboratorStatus.ACCEPTED,
        },
      },
    },
  });

  if (!registry) {
    throw Errors.notFound("Registry");
  }

  // Owner can always invite
  if (registry.ownerId === userId) {
    return true;
  }

  // If collaboratorsCanInvite is true and user is accepted collaborator
  if (registry.collaboratorsCanInvite && registry.collaborators.length > 0) {
    return true;
  }

  return false;
}

export default {
  createRegistry,
  listRegistriesForUser,
  getRegistryForViewer,
  canUserInvite,
};
