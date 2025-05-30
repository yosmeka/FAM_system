import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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
    { name: 'Maintenance request create', description: 'Create maintenance requests' },
    { name: 'Maintenance request view', description: 'View maintenance requests' },
    { name: 'Maintenance request edit/update', description: 'Edit or update maintenance requests' },
    { name: 'Maintenance request delete/cancel', description: 'Delete or cancel maintenance requests' },
    { name: 'Disposal approval', description: 'Approve disposals' },
    { name: 'Disposal rejection', description: 'Reject disposals' },
    { name: 'User view (list and detail)', description: 'View users (list and detail)' },
    { name: 'User create/invite', description: 'Create or invite users' },
    { name: 'User edit/update', description: 'Edit or update users' },
    { name: 'User role assignment/change', description: 'Assign or change user roles' },
    { name: 'Password reset', description: 'Reset passwords' },
    { name: 'Dashboard view', description: 'View dashboard' },
    { name: 'Assign role to user', description: 'Assign roles to users' },
    { name: 'Access denied handling (UI feedback, redirects)', description: 'Handle access denied (UI/redirects)' },
    { name: 'Settings view/update', description: 'View or update settings' },
    { name: 'Notifications (e.g. toast messages for actions)', description: 'Show notifications for actions' },
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

  // Assign 'User create/invite' permission to ADMIN role
  const userCreatePermission = await prisma.permission.findUnique({
    where: { name: 'User create/invite' },
  });
  if (userCreatePermission) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: 'ADMIN', permissionId: userCreatePermission.id } },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: userCreatePermission.id,
      },
    });
  }

  console.log({ user, permissionsSeeded: permissions.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });