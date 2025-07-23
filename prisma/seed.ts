import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  console.log("Updating inventory locations...");

  // Update/rename existing locations
  const locationUpdates = [
    { oldName: "Production Facility", newName: "Production", description: "Production and storage area" },
    { oldName: "Fulfillment Center", newName: "Fulfillment", description: "Fulfillment partner location" },
    { oldName: "In Transit", newName: "In Transit", description: "Items being delivered to customers" },
  ];

  for (const update of locationUpdates) {
    // Try to update existing location
    const existing = await prisma.inventoryLocation.findUnique({
      where: { name: update.oldName }
    });

    if (existing) {
      await prisma.inventoryLocation.update({
        where: { name: update.oldName },
        data: { 
          name: update.newName,
          description: update.description 
        }
      });
      console.log(`Updated ${update.oldName} → ${update.newName}`);
    } else {
      // Create new location if it doesn't exist
      await prisma.inventoryLocation.upsert({
        where: { name: update.newName },
        update: { description: update.description },
        create: { 
          name: update.newName,
          description: update.description 
        }
      });
      console.log(`Created ${update.newName}`);
    }
  }

  console.log("Location updates completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
