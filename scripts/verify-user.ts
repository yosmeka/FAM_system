const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking database users...');
    
    const users = await prisma.user.findMany();
    console.log('Users in database:', users);
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });
    
    if (admin) {
      console.log('✅ Admin user found:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 