import { PrismaClient } from '@prisma/client';

describe('Prisma Schema', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    // Only create client if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      prisma = new PrismaClient();
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should have valid Prisma client generated', () => {
    // This test verifies that the Prisma client was generated correctly
    // by checking that the PrismaClient class exists and has expected methods
    expect(PrismaClient).toBeDefined();
    expect(typeof PrismaClient).toBe('function');
  });

  it('should have all expected models defined', () => {
    // Create a temporary client instance to check model availability
    const testClient = new PrismaClient();

    // Verify all expected models are accessible
    expect(testClient.user).toBeDefined();
    expect(testClient.registry).toBeDefined();
    expect(testClient.collaborator).toBeDefined();
    expect(testClient.subList).toBeDefined();
    expect(testClient.item).toBeDefined();
    expect(testClient.inviteToken).toBeDefined();

    // Clean up
    testClient.$disconnect();
  });

  it('should connect to database when DATABASE_URL is provided', async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping DB connection test - DATABASE_URL not set');
      return;
    }

    // Test connection
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('should be able to query users when connected', async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping DB query test - DATABASE_URL not set');
      return;
    }

    // Simple query test - should not throw
    const users = await prisma.user.findMany({ take: 1 });
    expect(Array.isArray(users)).toBe(true);
  });
});
