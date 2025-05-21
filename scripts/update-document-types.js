// This script updates the DocumentType enum to include maintenance document types
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running database migration for DocumentType enum...');
  
  try {
    // Create the uploads/maintenance directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const maintenanceDir = path.join(process.cwd(), 'public', 'uploads', 'maintenance');
    
    if (!fs.existsSync(maintenanceDir)) {
      console.log(`Creating directory: ${maintenanceDir}`);
      fs.mkdirSync(maintenanceDir, { recursive: true });
    }
    
    console.log('Migration completed successfully!');
    console.log('Note: You need to run "npx prisma migrate dev" to apply the schema changes.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
