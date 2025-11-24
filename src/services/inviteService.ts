import { PrismaClient, CollaboratorStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { Errors } from "@/lib/errors";
import { sendMagicLinkInvite } from "@/lib/supabaseAdmin";

const prisma = new PrismaClient();

const INVITE_TOKEN_EXPIRY_DAYS = 30;

/**
 * Generates a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export interface InviteEmail {
  email: string;
  name?: string | null;
}

export interface InviteResult {
  email: string;
  success: boolean;
  collaboratorId?: string;
  isNew?: boolean;
  error?: string;
}

/**
 * Creates invite tokens and sends magic link emails
 */
export async function createInviteTokens(
  registryId: string,
  invites: InviteEmail[],
  createdByUserId: string,
): Promise<InviteResult[]> {
  const results: InviteResult[] = [];

  for (const invite of invites) {
    try {
      const result = await createSingleInvite(
        registryId,
        invite.email.toLowerCase(),
        invite.name || null,
        createdByUserId,
      );
      results.push(result);
    } catch (error) {
      results.push({
        email: invite.email,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Creates a single invite with token and sends email
 */
async function createSingleInvite(
  registryId: string,
  email: string,
  name: string | null,
  createdByUserId: string,
): Promise<InviteResult> {
  return prisma.$transaction(async (tx) => {
    // Create or get collaborator
    const { collaborator, isNew } = await createCollaboratorInTx(
      tx,
      registryId,
      email,
      name,
    );

    // Mark any existing unused tokens as used
    await tx.inviteToken.updateMany({
      where: {
        collaboratorId: collaborator.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Create new invite token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    await tx.inviteToken.create({
      data: {
        token,
        registryId,
        collaboratorId: collaborator.id,
        email,
        expiresAt,
        createdByUserId,
      },
    });

    // Send magic link email via Supabase
    // Use path parameter instead of query parameter to preserve token through Supabase redirect
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const redirectUrl = `${appBaseUrl}/accept-invite/${token}`;

    try {
      await sendMagicLinkInvite(email, redirectUrl);
    } catch (emailError) {
      // Log but don't fail - token is still created
      console.error("Failed to send invite email:", emailError);
    }

    return {
      email,
      success: true,
      collaboratorId: collaborator.id,
      isNew,
    };
  });
}

/**
 * Helper to create collaborator within a transaction
 */
async function createCollaboratorInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  registryId: string,
  email: string,
  name: string | null,
) {
  // Check if collaborator already exists
  const existing = await tx.collaborator.findUnique({
    where: {
      registryId_email: { registryId, email },
    },
  });

  if (existing) {
    return { collaborator: existing, isNew: false };
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

  return { collaborator, isNew: true };
}

/**
 * Validates and consumes an invite token
 * Links the authenticated user to the collaborator
 */
export async function validateAndConsumeInviteToken(
  token: string,
  userId: string,
  userEmail: string,
) {
  return prisma.$transaction(async (tx) => {
    // Find the token
    const inviteToken = await tx.inviteToken.findUnique({
      where: { token },
      include: {
        collaborator: true,
        registry: true,
      },
    });

    if (!inviteToken) {
      throw Errors.inviteInvalid();
    }

    if (inviteToken.used) {
      throw Errors.inviteUsed();
    }

    if (inviteToken.expiresAt < new Date()) {
      throw Errors.inviteExpired();
    }

    // Verify email matches
    if (inviteToken.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw Errors.emailMismatch();
    }

    if (!inviteToken.collaborator) {
      throw Errors.inviteInvalid();
    }

    // Mark token as used
    await tx.inviteToken.update({
      where: { id: inviteToken.id },
      data: { used: true },
    });

    // Update collaborator to accepted
    const updatedCollaborator = await tx.collaborator.update({
      where: { id: inviteToken.collaborator.id },
      data: {
        userId,
        status: CollaboratorStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        sublist: true,
        registry: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    });

    return {
      collaborator: updatedCollaborator,
      registry: inviteToken.registry,
    };
  });
}

/**
 * Gets invite token info (for display purposes, without consuming)
 */
export async function getInviteTokenInfo(token: string) {
  const inviteToken = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      registry: {
        select: {
          id: true,
          title: true,
          occasionDate: true,
          owner: {
            select: { name: true, email: true },
          },
        },
      },
      collaborator: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
        },
      },
    },
  });

  if (!inviteToken) {
    return null;
  }

  return {
    email: inviteToken.email,
    used: inviteToken.used,
    expired: inviteToken.expiresAt < new Date(),
    expiresAt: inviteToken.expiresAt,
    registry: inviteToken.registry,
    collaboratorStatus: inviteToken.collaborator?.status,
  };
}

/**
 * Accepts all pending invites for a user by their email address.
 * This is used when the user authenticates but the invite token wasn't preserved
 * in the redirect URL (e.g., Supabase strips query params).
 */
export async function acceptPendingInvitesByEmail(
  userId: string,
  userEmail: string,
) {
  const normalizedEmail = userEmail.toLowerCase();

  // Find all pending collaborator records for this email
  const pendingCollaborators = await prisma.collaborator.findMany({
    where: {
      email: normalizedEmail,
      status: CollaboratorStatus.PENDING,
      userId: null, // Not yet linked to a user
    },
    include: {
      registry: {
        select: {
          id: true,
          title: true,
        },
      },
      sublist: true,
    },
  });

  if (pendingCollaborators.length === 0) {
    return { accepted: [], count: 0 };
  }

  // Accept all pending invites in a transaction
  const accepted = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const collaborator of pendingCollaborators) {
      // Update collaborator to accepted
      const updated = await tx.collaborator.update({
        where: { id: collaborator.id },
        data: {
          userId,
          status: CollaboratorStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          registry: {
            select: {
              id: true,
              title: true,
            },
          },
          sublist: true,
        },
      });

      // Mark any unused tokens for this collaborator as used
      await tx.inviteToken.updateMany({
        where: {
          collaboratorId: collaborator.id,
          used: false,
        },
        data: {
          used: true,
        },
      });

      results.push({
        collaboratorId: updated.id,
        registryId: updated.registry.id,
        registryTitle: updated.registry.title,
        sublistId: updated.sublist?.id,
      });
    }

    return results;
  });

  return {
    accepted,
    count: accepted.length,
  };
}

export default {
  createInviteTokens,
  validateAndConsumeInviteToken,
  getInviteTokenInfo,
  acceptPendingInvitesByEmail,
};
