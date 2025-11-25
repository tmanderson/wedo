/**
 * Backfill script to set default names for existing sublists that don't have names
 * Run with: npx tsx scripts/backfill-sublist-names.ts
 */

import prisma from "../src/lib/prisma";

async function backfillSublistNames() {
  console.log("Starting sublist name backfill...");

  // Get all sublists without names
  const sublists = await prisma.subList.findMany({
    where: {
      name: null,
    },
    include: {
      collaborator: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${sublists.length} sublists without names`);

  let updated = 0;
  for (const sublist of sublists) {
    const collaborator = sublist.collaborator;

    // Determine the default name
    // Priority: user.name > collaborator.name > collaborator.email
    let defaultName: string;

    if (collaborator.user?.name) {
      defaultName = `${collaborator.user.name}'s List`;
    } else if (collaborator.name) {
      defaultName = `${collaborator.name}'s List`;
    } else {
      defaultName = `${collaborator.email}'s List`;
    }

    // Update the sublist
    await prisma.subList.update({
      where: { id: sublist.id },
      data: { name: defaultName },
    });

    console.log(`Updated sublist ${sublist.id}: "${defaultName}"`);
    updated++;
  }

  console.log(`\nBackfill complete! Updated ${updated} sublists.`);
}

backfillSublistNames()
  .catch((error) => {
    console.error("Error during backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
