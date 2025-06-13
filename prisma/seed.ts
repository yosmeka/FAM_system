import { PrismaClient, DepreciationMethodEnum } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // Clear existing permission-related data to ensure a clean slate
  console.log('Deleting existing UserPermission records...');
  await prisma.userPermission.deleteMany({});
  console.log('Deleting existing RolePermission records...');
  await prisma.rolePermission.deleteMany({});
  console.log('Deleting existing Permission records...');
  await prisma.permission.deleteMany({});
  console.log('Permission-related data cleared.');

  // Create a test user
  const password = await hash('password123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password,
      role: 'ADMIN',
    },
  });

  // Seed permissions
  const permissions = [
    { name: 'Asset view (list and detail)', description: 'View assets (list and detail)' },
    { name: 'Asset create', description: 'Create new assets' },
    { name: 'Asset edit', description: 'Edit assets' },
    { name: 'Asset delete', description: 'Delete assets' },
    { name: 'User delete', description: 'Delete users' },
    { name: 'Asset depreciation view', description: 'View asset depreciation' },
    { name: 'Asset document upload/view', description: 'Upload or view asset documents' },
    { name: 'Asset document delete', description: 'Delete asset documents' },
    { name: 'User view (list and detail)', description: 'View users (list and detail)' },
    { name: 'User create/invite', description: 'Create or invite users' },
    { name: 'User edit', description: 'Edit or update users' },
    { name: 'Dashboard view', description: 'View dashboard' },
    { name: 'Audit view', description: 'View audit information and assignments' },
    { name: 'Audit create', description: 'Create new audit requests or assignments' },
    { name: 'Audit perform', description: 'Perform assigned audits' },
    { name: 'Audit review', description: 'Review completed audits' },
    { name: 'Report view general', description: 'Access the main reports section' },
    { name: 'View asset report', description: 'View asset-specific reports' },
    { name: 'View audit report', description: 'View audit-specific reports' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Helper function to assign a permission to a role
  const assignPermissionToRole = async (roleName: 'ADMIN' | 'MANAGER' | 'USER', permissionName: string) => {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: roleName, permissionId: permission.id } },
        update: {},
        create: {
          role: roleName,
          permissionId: permission.id,
        },
      });
      console.log(`Assigned '${permissionName}' to ${roleName}`);
    } else {
      console.warn(`Permission '${permissionName}' not found. Cannot assign to ${roleName}.`);
    }
  };

  // Default permissions for ADMIN
  await assignPermissionToRole('ADMIN', 'User create/invite');
  await assignPermissionToRole('ADMIN', 'User delete');
  await assignPermissionToRole('ADMIN', 'User edit');
  await assignPermissionToRole('ADMIN', 'User view (list and detail)');
  await assignPermissionToRole('ADMIN', 'Dashboard view');

  // Default permissions for MANAGER
  await assignPermissionToRole('MANAGER', 'Asset view (list and detail)');
  await assignPermissionToRole('MANAGER', 'Dashboard view');

  // Default permissions for USER
  await assignPermissionToRole('USER', 'Asset create');
  await assignPermissionToRole('USER', 'Asset delete');
  await assignPermissionToRole('USER', 'Asset edit');
  await assignPermissionToRole('USER', 'Asset view (list and detail)');
  await assignPermissionToRole('USER', 'Asset document upload/view');

  console.log('Default role permissions assigned.');

  console.log('Seeding assets...');
  const assetsToCreate = [
    {
      name: 'Main Power Generator',
      description: 'Primary backup power generator for the main facility.',
      serialNumber: 'GEN-001',
      purchaseDate: new Date('2022-01-15'),
      purchasePrice: 25000,
      currentValue: 22000,
      status: 'ACTIVE',
      location: 'Utility Room 1',
      category: 'EQUIPMENT',
      type: 'Generator',
      depreciableCost: 25000,
      salvageValue: 2500,
      usefulLifeMonths: 120, // 10 years
      depreciationMethod: DepreciationMethodEnum.STRAIGHT_LINE,
      depreciationStartDate: new Date('2022-02-01'),
    },
    {
      name: 'HVAC Unit - North Wing',
      description: 'Main HVAC unit for the north side of the building.',
      serialNumber: 'HVAC-001',
      purchaseDate: new Date('2021-08-20'),
      purchasePrice: 15000,
      currentValue: 13000,
      status: 'ACTIVE',
      location: 'Rooftop Sector A',
      category: 'EQUIPMENT',
      type: 'HVAC',
      depreciableCost: 15000,
      salvageValue: 1500,
      usefulLifeMonths: 180, // 15 years
      depreciationMethod: DepreciationMethodEnum.STRAIGHT_LINE,
      depreciationStartDate: new Date('2021-09-01'),
    },
    {
      name: 'Dell Latitude 7420',
      description: 'Standard issue laptop for employees.',
      serialNumber: 'LT-DELL-001',
      purchaseDate: new Date('2023-05-10'),
      purchasePrice: 1200,
      currentValue: 1000,
      status: 'ACTIVE',
      location: 'IT Storage',
      category: 'IT_EQUIPMENT',
      type: 'Laptop',
      depreciableCost: 1200,
      salvageValue: 100,
      usefulLifeMonths: 36, // 3 years
      depreciationMethod: DepreciationMethodEnum.STRAIGHT_LINE,
      depreciationStartDate: new Date('2023-06-01'),
    },
    {
      name: 'Ford Transit Van',
      description: 'Company van for deliveries and transport.',
      serialNumber: 'VAN-FORD-001',
      purchaseDate: new Date('2020-02-28'),
      purchasePrice: 35000,
      currentValue: 28000,
      status: 'ACTIVE',
      location: 'Company Garage',
      category: 'VEHICLE',
      type: 'Van',
      depreciableCost: 35000,
      salvageValue: 5000,
      usefulLifeMonths: 60, // 5 years
      depreciationMethod: DepreciationMethodEnum.STRAIGHT_LINE,
      depreciationStartDate: new Date('2020-03-01'),
    },
  ];

  for (const assetData of assetsToCreate) {
    await prisma.asset.upsert({
      where: { serialNumber: assetData.serialNumber },
      update: {},
      create: assetData,
    });
  }

  console.log(`Seeded ${assetsToCreate.length} assets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });