import { PrismaClient, CollaboratorStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create test owner user
  const owner = await prisma.user.upsert({
    where: { email: 'test-owner@example.com' },
    update: {},
    create: {
      email: 'test-owner@example.com',
      name: 'Test Owner',
    },
  });

  console.log('Created/found owner user:', owner.id);

  // Create a test registry
  const registry = await prisma.registry.upsert({
    where: { id: 'test-registry-id' },
    update: {},
    create: {
      id: 'test-registry-id',
      title: 'Test Holiday Gift Registry',
      occasionDate: new Date('2025-12-25'),
      deadline: new Date('2025-12-20'),
      ownerId: owner.id,
      collaboratorsCanInvite: true,
    },
  });

  console.log('Created/found registry:', registry.id);

  // Create owner's collaborator entry
  const ownerCollaborator = await prisma.collaborator.upsert({
    where: {
      registryId_email: {
        registryId: registry.id,
        email: owner.email,
      },
    },
    update: {},
    create: {
      registryId: registry.id,
      userId: owner.id,
      email: owner.email,
      name: owner.name,
      status: CollaboratorStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });

  console.log('Created/found owner collaborator:', ownerCollaborator.id);

  // Create owner's sublist
  const ownerSublist = await prisma.subList.upsert({
    where: { collaboratorId: ownerCollaborator.id },
    update: {},
    create: {
      registryId: registry.id,
      collaboratorId: ownerCollaborator.id,
    },
  });

  console.log('Created/found owner sublist:', ownerSublist.id);

  // Create a test collaborator (pending)
  const collaboratorUser = await prisma.user.upsert({
    where: { email: 'test-collaborator@example.com' },
    update: {},
    create: {
      email: 'test-collaborator@example.com',
      name: 'Test Collaborator',
    },
  });

  const testCollaborator = await prisma.collaborator.upsert({
    where: {
      registryId_email: {
        registryId: registry.id,
        email: collaboratorUser.email,
      },
    },
    update: {},
    create: {
      registryId: registry.id,
      userId: collaboratorUser.id,
      email: collaboratorUser.email,
      name: collaboratorUser.name,
      status: CollaboratorStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });

  console.log('Created/found test collaborator:', testCollaborator.id);

  // Create test collaborator's sublist
  const collaboratorSublist = await prisma.subList.upsert({
    where: { collaboratorId: testCollaborator.id },
    update: {},
    create: {
      registryId: registry.id,
      collaboratorId: testCollaborator.id,
    },
  });

  console.log('Created/found collaborator sublist:', collaboratorSublist.id);

  // Create sample items on owner's sublist
  const sampleItem = await prisma.item.upsert({
    where: { id: 'test-item-id' },
    update: {},
    create: {
      id: 'test-item-id',
      sublistId: ownerSublist.id,
      label: 'Sample Gift Item',
      url: 'https://example.com/gift',
      parsedTitle: 'Sample Gift from Example.com',
      createdByUserId: owner.id,
    },
  });

  console.log('Created/found sample item:', sampleItem.id);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
