import { CollaboratorStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { Errors } from "@/lib/errors";
import type {
  CreateRegistryInput,
  UpdateRegistryInput,
} from "@/lib/validation";
import { sendMagicLinkInvite } from "@/lib/supabaseAdmin";
import prisma from "@/lib/prisma";

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
 * Optionally creates initial members with their items and sends invite emails
 */
export async function createRegistry(
  userId: string,
  userEmail: string,
  data: CreateRegistryInput,
): Promise<RegistryCreateResult> {
  console.log(
    `[createRegistry] Starting - members: ${data.initialMembers?.length || 0}`,
  );

  // Track invites to send after transaction
  const invitesToSend: Array<{ email: string; token: string }> = [];

  let result;
  try {
    result = await prisma.$transaction(
      async (tx) => {
        console.log(`[createRegistry] Transaction started`);
        // Create the registry
        const registry = await tx.registry.create({
          data: {
            title: data.title,
            occasionDate: data.occasionDate
              ? new Date(data.occasionDate)
              : null,
            deadline: data.deadline ? new Date(data.deadline) : null,
            ownerId: userId,
            collaboratorsCanInvite: data.collaboratorsCanInvite ?? false,
            allowSecretGifts: data.allowSecretGifts ?? false,
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

        // Create owner's sublist with default name
        const ownerName = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const defaultOwnerListName = ownerName?.name
          ? `${ownerName.name}'s List`
          : `${userEmail}'s List`;

        const sublist = await tx.subList.create({
          data: {
            registryId: registry.id,
            collaboratorId: collaborator.id,
            name: defaultOwnerListName,
            description: null,
          },
        });

        // Create initial members with their items if provided
        if (data.initialMembers && data.initialMembers.length > 0) {
          console.log(
            `[createRegistry] Processing ${data.initialMembers.length} members`,
          );
          for (const member of data.initialMembers) {
            const normalizedEmail = member.email.toLowerCase();
            console.log(`[createRegistry] Creating member: ${normalizedEmail}`);

            // Create collaborator (PENDING status)
            const memberCollaborator = await tx.collaborator.create({
              data: {
                registryId: registry.id,
                email: normalizedEmail,
                name: member.name || null,
                status: CollaboratorStatus.PENDING,
              },
            });

            // Create member's sublist with default name
            const defaultMemberListName = member.name
              ? `${member.name}'s List`
              : `${normalizedEmail}'s List`;

            const memberSublist = await tx.subList.create({
              data: {
                registryId: registry.id,
                collaboratorId: memberCollaborator.id,
                name: defaultMemberListName,
                description: member.description || null,
              },
            });

            // Create items for this member if any provided
            if (member.items && member.items.length > 0) {
              for (const item of member.items) {
                await tx.item.create({
                  data: {
                    sublistId: memberSublist.id,
                    label: item.label || null,
                    url: item.url || null,
                    createdByUserId: userId, // Created by the registry owner
                  },
                });
              }
            }

            // Create invite token for this member
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

            await tx.inviteToken.create({
              data: {
                token,
                registryId: registry.id,
                collaboratorId: memberCollaborator.id,
                email: normalizedEmail,
                expiresAt,
                createdByUserId: userId,
              },
            });

            // Queue invite to send after transaction completes
            invitesToSend.push({ email: normalizedEmail, token });
            console.log(`[createRegistry] Member created: ${normalizedEmail}`);
          }
        }

        console.log(
          `[createRegistry] Transaction completing - returning result`,
        );
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
      },
      {
        maxWait: 10000, // Wait up to 10 seconds to start transaction
        timeout: 20000, // Allow transaction to run for up to 20 seconds
      },
    );
  } catch (error) {
    console.error(`[createRegistry] Transaction failed:`, error);
    throw error; // Re-throw to let the API route handle it
  }

  console.log(`[createRegistry] Transaction completed successfully`);

  // Send invite emails after transaction completes successfully
  // Only send if user hasn't received an invite in the last 7 days
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  console.log(
    `[createRegistry] Checking ${invitesToSend.length} invites for deduplication`,
  );
  for (const invite of invitesToSend) {
    // Check if this email has received any invite in the last 7 days
    const recentInvite = await prisma.inviteToken.findFirst({
      where: {
        email: invite.email,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentInvite) {
      console.log(
        `Skipping invite email for ${invite.email} - already invited within last 7 days (last invite: ${recentInvite.createdAt.toISOString()})`,
      );
      continue;
    }

    // Send the invite email
    const redirectUrl = `${appBaseUrl}/accept-invite/${invite.token}`;
    console.log(`[createRegistry] Sending invite email to ${invite.email}`);
    sendMagicLinkInvite(invite.email, redirectUrl).catch((err) => {
      console.error(
        `[createRegistry] Failed to send invite email to ${invite.email}:`,
        err,
      );
    });
  }

  console.log(
    `[createRegistry] Completed successfully - registry: ${result.id}`,
  );
  return result;
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
          name: collaborator.sublist.name,
          description: collaborator.sublist.description,
          items: collaborator.sublist.items
            .map((item) => {
              // If viewer owns this sublist, redact claim info and hide secret items
              if (isViewerOwner) {
                // Secret items are completely invisible to the owner
                if (item.isSecret) {
                  return null;
                }

                return {
                  id: item.id,
                  label: item.label,
                  url: item.url,
                  description: item.description,
                  parsedTitle: item.parsedTitle,
                  isSecret: item.isSecret,
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
                description: item.description,
                parsedTitle: item.parsedTitle,
                isSecret: item.isSecret,
                createdAt: item.createdAt,
                deletedAt: item.deletedAt,
                deletedByUser: item.deletedByUser,
                status: item.status,
                claimedByUser: item.claimedByUser,
                claimedAt: item.claimedAt,
                boughtAt: item.boughtAt,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null),
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
    allowSecretGifts: registry.allowSecretGifts,
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

/**
 * Updates registry settings
 * Only the owner can update registry settings
 */
export async function updateRegistry(
  registryId: string,
  userId: string,
  data: UpdateRegistryInput,
) {
  // Verify user is the owner
  const registry = await prisma.registry.findUnique({
    where: { id: registryId },
  });

  if (!registry) {
    throw Errors.notFound("Registry");
  }

  if (registry.ownerId !== userId) {
    throw Errors.forbidden("Only the registry owner can update settings");
  }

  // If changing ownership, verify new owner is an accepted collaborator
  if (data.ownerId && data.ownerId !== registry.ownerId) {
    const newOwnerCollaborator = await prisma.collaborator.findFirst({
      where: {
        registryId,
        userId: data.ownerId,
        status: CollaboratorStatus.ACCEPTED,
      },
    });

    if (!newOwnerCollaborator) {
      throw Errors.validation(
        "New owner must be an accepted collaborator of this registry",
      );
    }
  }

  // Update registry
  const updated = await prisma.registry.update({
    where: { id: registryId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.occasionDate !== undefined && {
        occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
      }),
      ...(data.deadline !== undefined && {
        deadline: data.deadline ? new Date(data.deadline) : null,
      }),
      ...(data.collaboratorsCanInvite !== undefined && {
        collaboratorsCanInvite: data.collaboratorsCanInvite,
      }),
      ...(data.allowSecretGifts !== undefined && {
        allowSecretGifts: data.allowSecretGifts,
      }),
      ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    occasionDate: updated.occasionDate,
    deadline: updated.deadline,
    collaboratorsCanInvite: updated.collaboratorsCanInvite,
    allowSecretGifts: updated.allowSecretGifts,
    ownerId: updated.ownerId,
    owner: updated.owner,
  };
}

export default {
  createRegistry,
  listRegistriesForUser,
  getRegistryForViewer,
  canUserInvite,
  updateRegistry,
};
