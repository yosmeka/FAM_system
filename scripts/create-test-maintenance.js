// This script creates a test maintenance record
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the first asset from the database
  const asset = await prisma.asset.findFirst();
  
  if (!asset) {
    console.error('No assets found in the database');
    return;
  }
  
  console.log('Found asset:', asset.id, asset.name);
  
  // Get the first user from the database
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.error('No users found in the database');
    return;
  }
  
  console.log('Found user:', user.id, user.email);
  
  // Create a test maintenance record
  const maintenance = await prisma.maintenance.create({
    data: {
      assetId: asset.id,
      description: 'Test maintenance record',
      priority: 'MEDIUM',
      status: 'PENDING',
      requesterId: user.id,
    },
  });
  
  console.log('Created maintenance record:', maintenance.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
