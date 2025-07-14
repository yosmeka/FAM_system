import { PrismaClient, DepreciationMethodEnum } from '@prisma/client';
import { hash } from 'bcryptjs';
import { calculateMonthlyDepreciation } from '../src/utils/depreciation';

const prisma = new PrismaClient();

// async function seedAssetsWithDepreciation() {
//   console.log('Seeding 100 sample assets with depreciation schedules...');

//   // Clear existing data
//   await prisma.depreciationSchedule.deleteMany({});
//   await prisma.asset.deleteMany({});

//   const departments = ['IT', 'Operations', 'Logistics', 'Finance', 'HR', 'Facilities'];
//   const categories = ['EQUIPMENT', 'IT_EQUIPMENT', 'VEHICLE', 'FURNITURE', 'APPLIANCE'];
//   const types = ['Laptop', 'Generator', 'Van', 'Desk', 'Printer', 'Chair', 'HVAC'];

//   const assetsToCreate = Array.from({ length: 100 }).map((_, i) => {
//     const dept = departments[i % departments.length];
//     const cat = categories[i % categories.length];
//     const type = types[i % types.length];
//     const baseDate = new Date(2020 + (i % 5), (i % 12), 1 + (i % 28));
//     return {
//       name: `${type} Asset ${i + 1}`,
//       itemDescription: `Sample ${type} asset for ${dept} department.`,
//       serialNumber: `${type.toUpperCase()}-${i + 1}`,
//       oldTagNumber: `OLD-${type.toUpperCase()}-${i + 1}`,
//       newTagNumber: `NEW-${type.toUpperCase()}-${i + 1}`,
//       grnNumber: `GRN-${1000 + i}`,
//       grnDate: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before SIV
//       unitPrice: 1000 + (i * 100),
//       sivNumber: `SIV-${2000 + i}`,
//       sivDate: baseDate,
//       currentDepartment: dept,
//       remark: `Seeded asset #${i + 1}`,
//       usefulLifeYears: 3 + (i % 8),
//       residualPercentage: 5 + (i % 10),
//       currentValue: 1000 + (i * 90),
//       status: 'ACTIVE',
//       location: `${dept} Room ${1 + (i % 10)}`,
//       category: cat,
//       type: type,
//       depreciableCost: 1000 + (i * 100),
//       salvageValue: 100 + (i * 10),
//       depreciationMethod: DepreciationMethodEnum.STRAIGHT_LINE,
//     };
//   });

//   for (const assetData of assetsToCreate) {
//     try {
//       console.log('Creating asset:', assetData.serialNumber);
//       const asset = await prisma.asset.create({ data: assetData });
//       const schedule = calculateMonthlyDepreciation({
//         unitPrice: asset.unitPrice!,
//         sivDate: asset.sivDate!.toISOString(),
//         usefulLifeYears: asset.usefulLifeYears!,
//         salvageValue: asset.salvageValue ?? 0,
//         method: asset.depreciationMethod as unknown as import('../src/utils/depreciation').DepreciationMethod,
//       });
//       if (schedule.length > 0) {
//         console.log(`First depreciation schedule for ${asset.name}:`, schedule[0]);
//         await prisma.depreciationSchedule.createMany({
//           data: schedule.map(row => ({
//             assetId: asset.id,
//             year: row.year,
//             month: row.month,
//             bookValue: row.bookValue,
//           })),
//         });
//       } else {
//         console.warn(`No depreciation schedule generated for asset: ${asset.name}`);
//       }
//       console.log(`Seeded asset and depreciation schedule for: ${asset.name}`);
//     } catch (err) {
//       console.error('Error creating asset:', assetData.serialNumber, err);
//       break; // Stop on first error for easier debugging
//     }
//   }

//   console.log('Seeding complete.');
// }

// seedAssetsWithDepreciation()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

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
    where: { email: 'admin@zemen.com' },
    update: {},
    create: {
      email: 'admin@zemen.com',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });