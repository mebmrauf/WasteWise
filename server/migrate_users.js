const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { accountType: "HOUSEHOLD" },
    data: { accountType: "INDIVIDUAL" },
  });
  console.log(`Updated ${updated.count} users from HOUSEHOLD to INDIVIDUAL.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
