const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    data: { accountType: "BUSINESS" },
  });
  console.log(`Updated ${updated.count} users to BUSINESS account type.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
