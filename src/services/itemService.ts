import { PrismaClient, ItemStatus, CollaboratorStatus } from "@prisma/client";
import { Errors } from "@/lib/errors";
import { parseUrlTitle } from "@/lib/urlParser";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validation";

const prisma = new PrismaClient();

/**
 * Creates a new item on a sublist
 * Only the sublist owner can create items
 */
export async function createItem(
  sublistId: string,
  createdByUserId: string,
  data: CreateItemInput,
) {
  // Verify the user owns this sublist
  const sublist = await prisma.subList.findUnique({
    where: { id: sublistId },
    include: {
      collaborator: true,
    },
  });

  if (!sublist) {
    throw Errors.notFound("Sublist");
  }

  if (sublist.collaborator.userId !== createdByUserId) {
    throw Errors.forbidden("You can only add items to your own sublist");
  }

  // Parse URL title if URL provided
  let parsedTitle: string | null = null;
  if (data.url) {
    parsedTitle = await parseUrlTitle(data.url);
  }

  return prisma.item.create({
    data: {
      sublistId,
      label: data.label || null,
      url: data.url || null,
      parsedTitle,
      createdByUserId,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Updates an existing item
 * Only the sublist owner can update their items
 */
export async function updateItem(
  itemId: string,
  userId: string,
  data: UpdateItemInput,
) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      sublist: {
        include: { collaborator: true },
      },
    },
  });

  if (!item) {
    throw Errors.notFound("Item");
  }

  if (item.sublist.collaborator.userId !== userId) {
    throw Errors.forbidden("You can only edit items on your own sublist");
  }

  if (item.deletedAt) {
    throw Errors.itemDeleted();
  }

  // Re-parse URL title if URL changed
  let parsedTitle = item.parsedTitle;
  if (data.url && data.url !== item.url) {
    parsedTitle = await parseUrlTitle(data.url);
  } else if (data.url === null) {
    parsedTitle = null;
  }

  return prisma.item.update({
    where: { id: itemId },
    data: {
      label: data.label !== undefined ? data.label : item.label,
      url: data.url !== undefined ? data.url : item.url,
      parsedTitle,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      claimedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Soft-deletes an item
 * Only the sublist owner can delete their items
 * Item remains visible to collaborators with "deleted by owner" flag
 */
export async function softDeleteItem(itemId: string, userId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      sublist: {
        include: { collaborator: true },
      },
    },
  });

  if (!item) {
    throw Errors.notFound("Item");
  }

  if (item.sublist.collaborator.userId !== userId) {
    throw Errors.forbidden("You can only delete items on your own sublist");
  }

  if (item.deletedAt) {
    throw Errors.itemDeleted();
  }

  return prisma.item.update({
    where: { id: itemId },
    data: {
      deletedByUserId: userId,
      deletedAt: new Date(),
    },
    include: {
      deletedByUser: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Claims an item (transactional with row-level lock)
 * - Item must not be deleted
 * - Item must not already be claimed
 * - Claimer must not be the sublist owner
 */
export async function claimItem(itemId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock the item row for update
    const items = await tx.$queryRaw<
      Array<{
        id: string;
        sublistId: string;
        deletedAt: Date | null;
        status: ItemStatus;
        claimedByUserId: string | null;
      }>
    >`
      SELECT id, "sublistId", "deletedAt", status, "claimedByUserId"
      FROM "Item"
      WHERE id = ${itemId}
      FOR UPDATE
    `;

    const item = items[0];

    if (!item) {
      throw Errors.notFound("Item");
    }

    if (item.deletedAt) {
      throw Errors.itemDeleted();
    }

    if (item.claimedByUserId) {
      // Get claimer info for error response
      const claimer = await tx.user.findUnique({
        where: { id: item.claimedByUserId },
        select: { id: true, name: true },
      });
      throw Errors.alreadyClaimed(
        claimer
          ? { id: claimer.id, name: claimer.name || undefined }
          : undefined,
      );
    }

    // Verify claimer is not the sublist owner
    const sublist = await tx.subList.findUnique({
      where: { id: item.sublistId },
      include: { collaborator: true },
    });

    if (!sublist) {
      throw Errors.notFound("Sublist");
    }

    if (sublist.collaborator.userId === userId) {
      throw Errors.forbidden("You cannot claim items on your own sublist");
    }

    // Verify claimer is an accepted collaborator of this registry
    const isCollaborator = await tx.collaborator.findFirst({
      where: {
        registryId: sublist.registryId,
        userId,
        status: CollaboratorStatus.ACCEPTED,
      },
    });

    if (!isCollaborator) {
      throw Errors.forbidden("You must be a collaborator to claim items");
    }

    // Perform the claim
    return tx.item.update({
      where: { id: itemId },
      data: {
        status: ItemStatus.CLAIMED,
        claimedByUserId: userId,
        claimedAt: new Date(),
      },
      include: {
        claimedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });
}

/**
 * Releases a claim on an item (transactional with row-level lock)
 * Only the current claimer can release
 */
export async function releaseItem(itemId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock the item row for update
    const items = await tx.$queryRaw<
      Array<{
        id: string;
        claimedByUserId: string | null;
        status: ItemStatus;
      }>
    >`
      SELECT id, "claimedByUserId", status
      FROM "Item"
      WHERE id = ${itemId}
      FOR UPDATE
    `;

    const item = items[0];

    if (!item) {
      throw Errors.notFound("Item");
    }

    if (item.claimedByUserId !== userId) {
      throw Errors.forbidden("Only the claimer can release this item");
    }

    // Release the claim
    return tx.item.update({
      where: { id: itemId },
      data: {
        status: ItemStatus.UNCLAIMED,
        claimedByUserId: null,
        claimedAt: null,
        boughtAt: null,
      },
    });
  });
}

/**
 * Marks an item as bought (transactional with row-level lock)
 * Only the current claimer can mark as bought
 */
export async function markBought(itemId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock the item row for update
    const items = await tx.$queryRaw<
      Array<{
        id: string;
        claimedByUserId: string | null;
        status: ItemStatus;
      }>
    >`
      SELECT id, "claimedByUserId", status
      FROM "Item"
      WHERE id = ${itemId}
      FOR UPDATE
    `;

    const item = items[0];

    if (!item) {
      throw Errors.notFound("Item");
    }

    if (item.claimedByUserId !== userId) {
      throw Errors.forbidden("Only the claimer can mark this item as bought");
    }

    if (item.status === ItemStatus.BOUGHT) {
      // Already bought, return current state
      return tx.item.findUnique({
        where: { id: itemId },
        include: {
          claimedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }

    // Mark as bought
    return tx.item.update({
      where: { id: itemId },
      data: {
        status: ItemStatus.BOUGHT,
        boughtAt: new Date(),
      },
      include: {
        claimedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });
}

/**
 * Gets an item by ID with visibility rules applied
 */
export async function getItem(itemId: string, viewerUserId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      sublist: {
        include: {
          collaborator: true,
        },
      },
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
  });

  if (!item) {
    throw Errors.notFound("Item");
  }

  // Check if viewer is the sublist owner
  const isOwner = item.sublist.collaborator.userId === viewerUserId;

  // Apply visibility rules
  if (isOwner) {
    return {
      ...item,
      status: null,
      claimedByUser: null,
      claimedAt: null,
      boughtAt: null,
    };
  }

  return item;
}

export default {
  createItem,
  updateItem,
  softDeleteItem,
  claimItem,
  releaseItem,
  markBought,
  getItem,
};
