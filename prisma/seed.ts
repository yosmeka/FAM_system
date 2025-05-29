import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // Clear existing permission-related data to ensure a clean slate
  // Note: Order matters due to foreign key constraints.
  // UserPermission records depend on User and Permission.
  // RolePermission records depend on Role (enum, not a table here) and Permission.
  console.log('Deleting existing UserPermission records...');
  await prisma.userPermission.deleteMany({});
  console.log('Deleting existing RolePermission records...');
  await prisma.rolePermission.deleteMany({});
  console.log('Deleting existing Permission records...');
  await prisma.permission.deleteMany({});
  console.log('Permission-related data cleared.');

  // Create a test user
  const password = await hash('password123', 12);

  const user = await prisma.user.upsert({
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
    // --- Maintenance (Currently unused as per previous request) ---
    // { name: 'Maintenance request create', description: 'Create maintenance requests' },
    // { name: 'Maintenance request view', description: 'View maintenance requests' },
    // { name: 'Maintenance request edit/update', description: 'Edit or update maintenance requests' },
    // { name: 'Maintenance request delete/cancel', description: 'Delete or cancel maintenance requests' },
    // --- Disposal (Currently unused as per previous request) ---
    // { name: 'Disposal approval', description: 'Approve disposals' },
    // { name: 'Disposal rejection', description: 'Reject disposals' },
    { name: 'User view (list and detail)', description: 'View users (list and detail)' },
    { name: 'User create/invite', description: 'Create or invite users' },
    { name: 'User edit/update', description: 'Edit or update users' },
    // --- User Management (Admin only, not assigned via roles page, but exist for direct assignment if ever needed) ---
    // { name: 'User role assignment/change', description: 'Assign or change user roles' },
    // { name: 'Password reset', description: 'Reset passwords' },
    // --- Dashboard & Settings (Removed as per previous request) ---
    // { name: 'Dashboard view', description: 'View dashboard' },
    // { name: 'Assign role to user', description: 'Assign roles to users' },
    // { name: 'Access denied handling (UI feedback, redirects)', description: 'Handle access denied (UI/redirects)' },
    // { name: 'Settings view/update', description: 'View or update settings' },
    // { name: 'Notifications (e.g. toast messages for actions)', description: 'Show notifications for actions' },

    // --- New Audit Permissions ---
    { name: 'Audit view', description: 'View audit information and assignments' },
    { name: 'Audit create', description: 'Create new audit requests or assignments' },
    { name: 'Audit perform', description: 'Perform assigned audits' },
    { name: 'Audit review', description: 'Review completed audits' },

    // --- New Report Permissions ---
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

  // Assign 'User edit/update' permission to ADMIN role
  const userEditUpdatePermission = await prisma.permission.findUnique({
    where: { name: 'User edit/update' },
  });
  if (userEditUpdatePermission) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'ADMIN', permissionId: userEditUpdatePermission.id } },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: userEditUpdatePermission.id,
      },
    });
  }

  // Assign 'User view (list and detail)' permission to ADMIN role
  const userViewPermission = await prisma.permission.findUnique({
    where: { name: 'User view (list and detail)' },
  });
  if (userViewPermission) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'ADMIN', permissionId: userViewPermission.id } },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: userViewPermission.id,
      },
    });
  }

  console.log({ user, permissionsSeeded: permissions.length });

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
  // 'User edit/update' and 'User view (list and detail)' are already assigned above, but this ensures it if they weren't.
  await assignPermissionToRole('ADMIN', 'User edit/update');
  await assignPermissionToRole('ADMIN', 'User view (list and detail)');


  // Default permissions for MANAGER
  await assignPermissionToRole('MANAGER', 'Asset view (list and detail)');

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