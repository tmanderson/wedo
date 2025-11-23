import { PrismaClient, CollaboratorStatus, ItemStatus } from '@prisma/client';
import { Errors } from '@/lib/errors';

const prisma = new PrismaClient();

/**
 * Creates a new collaborator (PENDING status) and their sublist
 */
export async function createCollaborator(
  registryId: string,
  email: string,
  name: string | null,
  createdByUserId: string
) {
  return prisma.$transaction(async (tx) => {
    // Check if collaborator already exists
    const existing = await tx.collaborator.findUnique({
      where: {
        registryId_email: { registryId, email },
      },
    });

    if (existing) {
      // Return existing collaborator info
      return {
        collaborator: existing,
        isNew: false,
      };
    }

    // Create new collaborator
    const collaborator = await tx.collaborator.create({
      data: {
        registryId,
        email,
        name,
        status: CollaboratorStatus.PENDING,
      },
    });

    // Create their sublist
    await tx.subList.create({
      data: {
        registryId,
        collaboratorId: collaborator.id,
      },
    });

    return {
      collaborator,
      isNew: true,
    };
  });
}

/**
 * Accepts a collaborator invite - links user to collaborator record
 */
export async function acceptCollaborator(
  collaboratorId: string,
  userId: string,
  userEmail: string
) {
  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
  });

  if (!collaborator) {
    throw Errors.notFound('Collaborator');
  }

  // Verify email matches
  if (collaborator.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw Errors.emailMismatch();
  }

  // Update collaborator to accepted
  return prisma.collaborator.update({
    where: { id: collaboratorId },
    data: {
      userId,
      status: CollaboratorStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
    include: {
      registry: true,
      sublist: true,
    },
  });
}

/**
 * Removes a collaborator from a registry
 * - Clears any claims they hold on other items
 * - Deletes their collaborator record (cascades to sublist and items)
 * - Marks their invite tokens as used
 */
export async function removeCollaborator(
  registryId: string,
  collaboratorId: string,
  actingUserId: string
) {
  return prisma.$transaction(async (tx) => {
    // Get the registry to check permissions
    const registry = await tx.registry.findUnique({
      where: { id: registryId },
    });

    if (!registry) {
      throw Errors.notFound('Registry');
    }

    // Only owner can remove collaborators (MVP)
    if (registry.ownerId !== actingUserId) {
      throw Errors.forbidden('Only the registry owner can remove collaborators');
    }

    // Get the collaborator being removed
    const collaborator = await tx.collaborator.findUnique({
      where: { id: collaboratorId },
      include: { sublist: true },
    });

    if (!collaborator || collaborator.registryId !== registryId) {
      throw Errors.notFound('Collaborator');
    }

    // Cannot remove yourself if you're the owner
    if (collaborator.userId === actingUserId) {
      throw Errors.forbidden('Cannot remove yourself from your own registry');
    }

    // Clear any claims this collaborator holds on other items
    let claimsClearedCount = 0;
    if (collaborator.userId) {
      const clearResult = await tx.item.updateMany({
        where: {
          claimedByUserId: collaborator.userId,
          sublist: {
            registryId,
            collaboratorId: { not: collaboratorId }, // On other sublists
          },
        },
        data: {
          status: ItemStatus.UNCLAIMED,
          claimedByUserId: null,
          claimedAt: null,
          boughtAt: null,
        },
      });
      claimsClearedCount = clearResult.count;
    }

    // Count items being deleted
    const itemsCount = collaborator.sublist
      ? await tx.item.count({ where: { sublistId: collaborator.sublist.id } })
      : 0;

    // Mark invite tokens as used
    await tx.inviteToken.updateMany({
      where: {
        collaboratorId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Delete the collaborator (cascades to sublist and items)
    await tx.collaborator.delete({
      where: { id: collaboratorId },
    });

    return {
      success: true,
      itemsDeletedCount: itemsCount,
      claimsClearedCount,
    };
  });
}

/**
 * Gets a collaborator by ID with their sublist
 */
export async function getCollaborator(collaboratorId: string) {
  return prisma.collaborator.findUnique({
    where: { id: collaboratorId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      sublist: true,
      registry: true,
    },
  });
}

/**
 * Gets a collaborator by registry and email
 */
export async function getCollaboratorByEmail(registryId: string, email: string) {
  return prisma.collaborator.findUnique({
    where: {
      registryId_email: { registryId, email: email.toLowerCase() },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      sublist: true,
    },
  });
}

export default {
  createCollaborator,
  acceptCollaborator,
  removeCollaborator,
  getCollaborator,
  getCollaboratorByEmail,
};
